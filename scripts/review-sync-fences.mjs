/**
 * 深挖：逐块打印本地与上游不一致的 fenced code block 内容，
 * 便于人工判定是「中文化约定允许的注释/自然语言」还是「代码/命令被改坏」。
 * 用法：node scripts/review-sync-deep.mjs <相对路径...>（不给参数则打印全部不一致块）
 */

import { readFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const local = join(root, 'skills')
const upstream = process.env.SP_UPSTREAM || join(process.env.TEMP || '', 'sp-upstream', 'skills')
const norm = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
const fenceRe = /```(\w*)[^\n]*\n([\s\S]*?)```/g

const targets = process.argv.slice(2)
const allFiles = [
  'brainstorming/SKILL.md', 'dispatching-parallel-agents/SKILL.md', 'executing-plans/SKILL.md',
  'finishing-a-development-branch/SKILL.md', 'receiving-code-review/SKILL.md', 'requesting-code-review/SKILL.md',
  'subagent-driven-development/SKILL.md', 'systematic-debugging/SKILL.md', 'test-driven-development/SKILL.md',
  'using-git-worktrees/SKILL.md', 'verification-before-completion/SKILL.md', 'writing-plans/SKILL.md',
  'writing-skills/SKILL.md',
]

function splitBlocks(raw) {
  return [...raw.matchAll(fenceRe)].map((m) => ({ lang: m[1], body: m[2] }))
}

for (const rel of targets.length ? targets : allFiles) {
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
