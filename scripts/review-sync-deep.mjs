/**
 * 本地 skills/ 与上游 v6.4.2 的同步一致性最终复核（v7.0.0 发版前必跑）。
 * 口径 = CLAUDE.md 中文化契约：
 *   - 代码块、命令、路径、变量名、正则、YAML/JSON、dot 语法 保持原文（字节一致）
 *   - 正文自然语言、行内注释、示例对话 → 简体中文
 * 用法：$env:SP_UPSTREAM = <上游 skills 目录>; node scripts/review-sync-deep.mjs
 * 说明：文件树完整性与 SKILL.md frontmatter 为硬门槛；其余输出仅供参考。
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const UP = process.env.SP_UPSTREAM || join(process.env.TEMP ?? '/tmp', 'sp-upstream', 'skills')
const norm = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
const fenceRe = /```(\w*)[^\n]*\n([\s\S]*?)```/g
const blocks = (s) => [...s.matchAll(fenceRe)].map((m) => ({ lang: m[1], body: m[2] }))
const heads = (s) => (s.replace(/```[\s\S]*?```/g, '').match(/^#{1,6} /gm) || []).map((h) => h.trim())
// 一行内：`#` 之后视为注释（仅行首/前置空白后出现 # 才切）
const splitComment = (line) => {
  const m = line.match(/^([^#]*?)(\s+#.*)$/)
  return m ? [m[1].replace(/\s+$/, ''), m[2]] : [line, '']
}
const hasCJK = (s) => /[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(s)

async function walk(dir, base = dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p, base)))
    else out.push(p.slice(base.length + 1).replace(/\\/g, '/'))
  }
  return out.sort()
}

const upFiles = await walk(UP)
const loFiles = await walk('skills')
const rels = [...new Set([...upFiles, ...loFiles])]

let fails = 0
let notes = []
let ok = 0

for (const rel of rels) {
  const upPath = join(UP, rel)
  const loPath = join('skills', rel)
  const upOk = upFiles.includes(rel)
  const loOk = loFiles.includes(rel)

  if (!loOk) { console.log(`FAIL [缺失] ${rel}（上游有，本地无）`); fails++; continue }
  if (!upOk) { console.log(`INFO [本地新增] ${rel}`); notes.push(rel); continue } // dsh-tools.md 白名单

  const [uRaw, lRaw] = await Promise.all([readFile(upPath, 'utf8'), readFile(loPath, 'utf8')])
  const u = norm(uRaw)
  const l = norm(lRaw)
  const isSkill = rel.endsWith('/SKILL.md')

  if (!rel.endsWith('.md')) {
    // 非 md：字节一致（CRLF 归一后）
    if (u !== l) { console.log(`FAIL [非md不一致] ${rel}`); fails++ }
    else ok++
    continue
  }

  if (isSkill) {
    const mU = u.match(/^---\n([\s\S]*?)\n---\n/)
    const mL = l.match(/^---\n([\s\S]*?)\n---\n/)
    if (!mU || !mL) { console.log(`FAIL [无frontmatter] ${rel}`); fails++; continue }
    const fmU = mU[1].split('\n').find((x) => x.startsWith('name:'))
    const fmL = mL[1].split('\n').find((x) => x.startsWith('name:'))
    if (!fmU || fmU !== fmL) { console.log(`FAIL [frontmatter.name不一致] ${rel}: 上游 "${fmU ?? '无'}" 本地 "${fmL ?? '无'}"`); fails++ }
    const descU = mU[1].match(/^description:\s*(.+)$/m)?.[1]
    const descL = mL[1].match(/^description:\s*(.+)$/m)?.[1]
    if (!descL) { console.log(`FAIL [description缺失] ${rel}`); fails++ }
    else if (!/[\u4e00-\u9fff]/.test(descL)) { console.log(`FAIL [description未中文化] ${rel}`); fails++ }
  }

  // 代码块：逐块比对
  const ub = blocks(u)
  const lb = blocks(l)
  if (ub.length !== lb.length) {
    console.log(`FAIL [代码块数] ${rel}: ${ub.length} -> ${lb.length}`)
    fails++
  } else {
    for (let i = 0; i < ub.length; i++) {
      if (ub[i].body === lb[i].body) continue
      const a = ub[i].body.split('\n')
      const b = lb[i].body.split('\n')
      if (a.length !== b.length) {
        console.log(`NOTE [块行数] ${rel} #${i + 1} (${ub[i].lang || '?'}): ${a.length} -> ${b.length}（中文换行差异，需人工复核）`)
        notes.push(`${rel} #${i + 1}`)
        continue
      }
      for (let j = 0; j < a.length; j++) {
        if (a[j] === b[j]) continue
        const [ab, ac] = splitComment(a[j])
        const [bb, bc] = splitComment(b[j])
        if (ab === bb && ac !== bc) continue // 仅注释变化 → 契约允许
        if (hasCJK(b[j]) && !/^[\s|`\-#\d]/.test(b[j].trim()) && (ub[i].lang === 'dot' || ub[i].lang === '')) continue // dot/自然语言块内中文
        console.log(`NOTE [块内容] ${rel} #${i + 1} (${ub[i].lang || '?'}) L${j + 1}`)
        console.log(`    上游: ${a[j].slice(0, 160)}`)
        console.log(`    本地: ${b[j].slice(0, 160)}`)
        notes.push(`${rel} #${i + 1}`)
      }
    }
  }

  // SKILL.md 标题数对齐
  if (isSkill) {
    const hu = heads(u)
    const hl = heads(l)
    if (hu.length !== hl.length) {
      console.log(`FAIL [标题数] ${rel}: ${hu.length} -> ${hl.length}`)
      fails++
    }
  }
  ok++
}

console.log(`\n==== 汇总 ====`)
console.log(`检查文件数: ${rels.length}（上游 ${upFiles.length} / 本地 ${loFiles.length}）`)
console.log(`FAIL: ${fails}  NOTE: ${notes.length}`)
console.log(`通过（含契约允许的本地化差异）: ${ok}`)
if (fails) process.exit(1)