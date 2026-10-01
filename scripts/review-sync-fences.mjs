/**
 * 深挖：逐块打印本地与上游不一致的 fenced code block 内容，
 * 便于人工判定是「中文化约定允许的注释/自然语言」还是「代码/命令被改坏」。
 * 用法：node scripts/review-sync-fences.mjs <相对路径...>（不给参数则打印全部不一致块）
 * 说明：技能清单由 sync-common 从上游目录动态派生，新增技能自动覆盖。
 */

import { readFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { norm, splitBlocks, syncSkillsList } from './lib/sync-common.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const local = join(root, 'skills')
const upstream = process.env.SP_UPSTREAM || join(process.env.TEMP || '', 'sp-upstream', 'skills')

const targets = process.argv.slice(2)
if (!targets.length) {
  // 动态派生：老实现硬编码 13 技能清单，漏掉 diagnosing-superpowers 与 using-superpowers
  const skills = await syncSkillsList(upstream)
  targets.push(...skills)
}

for (const rel of targets) {
  const upRaw = norm(await readFile(join(upstream, rel), 'utf8'))
  const lRaw = norm(await readFile(join(local, rel), 'utf8'))
  const upB = splitBlocks(upRaw)
  const lB = splitBlocks(lRaw)
  console.log(`\n========== ${rel} ==========`)
  if (upB.length !== lB.length) console.log(`  块数不同: 上游 ${upB.length} / 本地 ${lB.length}`)
  const n = Math.max(upB.length, lB.length)
  for (let i = 0; i < n; i++) {
    const u = upB[i]?.body ?? ''
    const l = lB[i]?.body ?? ''
    if (u === l) continue
    console.log(`\n--- 代码块 #${i + 1} (lang ${upB[i]?.lang ?? '?'} -> ${lB[i]?.lang ?? '?'}) ---`)
    const uLines = u.split('\n')
    const lLines = l.split('\n')
    const max = Math.max(uLines.length, lLines.length)
    for (let j = 0; j < max; j++) {
      const a = uLines[j] ?? '<缺>'
      const b = lLines[j] ?? '<缺>'
      if (a !== b) console.log(`  L${j + 1} 上游: ${a.slice(0, 150)}\n      本地: ${b.slice(0, 150)}`)
    }
  }
}
