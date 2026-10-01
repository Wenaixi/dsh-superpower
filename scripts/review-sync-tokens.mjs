/**
 * 代码块 token 级校验：确保命令、参数、路径、环境变量、占位符在本地化后仍逐字保留。
 * token 级不受「中文更紧凑导致行合并」影响——只要 token 还在文件里就算通过。
 * 用法：$env:SP_UPSTREAM = <上游 skills>; node scripts/review-sync-tokens.mjs
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const norm = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
const fenceRe = /```(\w*)[^\n]*\n([\s\S]*?)```/g
const codeOnly = (s) => [...s.matchAll(fenceRe)].map((m) => m[2]).join('\n')

async function walk(dir, base = dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p, base)))
    else if (e.name.endsWith('.md')) out.push(p.slice(base.length + 1).replace(/\\/g, '/'))
  }
  return out
}

const patterns = [
  ['参数', /(?<=^|[\s(`])--?[A-Za-z][\w-]*/gm],
  ['环境变量', /\$\{?[A-Z_][A-Z0-9_]{1,}\}?/g],
  ['占位符', /[<[{][A-Z][A-Z0-9_]{2,}[>\]}]/g],
  ['脚本路径', /\bscripts\/[\w./-]+/g],
  ['命令词', /(?<=^\s{0,8})(bash|sh|node|npx|pnpm|npm|git|python3?|pytest|go|cargo|make|docker|kubectl|curl|echo|grep|awk|sed|find|cat|ls|mkdir|rm|chmod|cd|env|security|codesign)\b/gm],
]

let issues = []
let n = 0
for (const rel of (await walk(process.env.SP_UPSTREAM))) {
  let lRaw = null
  try { lRaw = norm(await readFile(join('skills', rel), 'utf8')) } catch { continue }
  const uCode = codeOnly(norm(await readFile(join(process.env.SP_UPSTREAM, rel), 'utf8')))
  const lAll = lRaw.replace(/\r\n/g, '\n')
  n++
  for (const [label, re] of patterns) {
    const found = new Set([...uCode.matchAll(re)].map((m) => m[0]))
    const missing = [...found].filter((t) => !lAll.includes(t))
    if (missing.length) issues.push(`${rel} [${label}] 本地缺失: ${missing.join(' | ')}`)
  }
}
console.log(`已扫描文档: ${n}`)
console.log(issues.length ? '发现 token 缺失：' : 'token 级校验：全部通过（无缺失）')
for (const i of issues) console.log(' ', i)
if (issues.length) process.exit(1)