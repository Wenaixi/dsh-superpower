import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillDir = join(root, 'skills')
console.log(`[verify] skillDir: ${skillDir}`)

const entries = await readdir(skillDir, { withFileTypes: true })
const skillDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name).sort()
console.log(`[verify] found ${skillDirs.length} skill directories: ${skillDirs.join(', ')}`)

let ok = true

// SKILL.md frontmatter 与 name/目录一致校验
for (const dir of skillDirs) {
  const p = join(skillDir, dir, 'SKILL.md')
  try { await stat(p) } catch { console.error(`[verify] MISSING ${p}`); ok = false; continue }
  const raw = await readFile(p, 'utf8')
  const hasFrontmatter = raw.startsWith('---\n') && raw.includes('\n---\n')
  const nameMatch = raw.match(/name:\s*([a-z0-9-]+)/)
  const descMatch = raw.match(/description:\s*["']?(.+)["']?/)
  if (!hasFrontmatter) { console.error(`[verify] ${dir}: missing frontmatter`); ok = false }
  else if (!nameMatch) { console.error(`[verify] ${dir}: missing name`); ok = false }
  else if (nameMatch[1] !== dir) { console.error(`[verify] ${dir}: name drift (frontmatter "${nameMatch[1]}" != dir "${dir}")`); ok = false }
  else console.log(`[verify] ✓ ${dir} ${descMatch ? `(${descMatch[1].slice(0, 60)})` : ''}`)
}

const EXPECTED = 15
console.log(`\n[verify] expected ${EXPECTED} skills, found ${skillDirs.length} -> ${skillDirs.length === EXPECTED ? 'PASS' : 'FAIL'}`)
if (skillDirs.length !== EXPECTED) ok = false

// 技能正文中 markdown 链接的相对路径引用存在性检查（防执行时死链）
console.log('\n[verify] relative-reference check')
const refCache = new Map()
async function refExists(p) {
  if (refCache.has(p)) return refCache.get(p)
  let v
  try { await stat(p); v = true } catch { v = false }
  refCache.set(p, v)
  return v
}
const isProbablyFile = r => /\.(?:md|markdown|cjs|js|ts|sh|html|json|yaml|yml|dot|txt)$/i.test(r)
for (const dir of skillDirs) {
  const skillRoot = join(skillDir, dir)
  const files = []
  async function walk(d) {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const fp = join(d, e.name)
      if (e.isDirectory()) await walk(fp)
      else files.push(fp)
    }
  }
  await walk(skillRoot)
  for (const fp of files) {
    if (!fp.endsWith('.md')) continue
    const text = await readFile(fp, 'utf8')
    // 跳过 fenced code block（块内是文档示例，不是真实引用），只检查正文链接
    let inFence = false
    for (const line of text.split('\n')) {
      if (/^\s*(```+|`{3,})/.test(line)) { inFence = !inFence; continue }
      if (inFence) continue
      for (const m of line.matchAll(/\]\(([^)#\s]+)\)/g)) {
        const r = m[1]
        if (r.startsWith('http') || r.includes('://') || r.startsWith('#') || r.startsWith('mailto:') || r.startsWith('data:')) continue
        if (r.startsWith('superpowers:') || r.startsWith('skill(')) continue
        const target = resolve(dirname(fp), r)
        if (isProbablyFile(r) && !(await refExists(target))) {
          console.error(`[verify] DEAD LINK ${relative(root, fp)} -> ${r}`)
          ok = false
        }
      }
    }
  }
}
console.log(ok ? '[verify] relative-reference check PASS' : '[verify] relative-reference check FAIL')

// 关键文件
const checks = [
  'skills/using-superpowers/references/dsh-tools.md',
  'skills/diagnosing-superpowers/SKILL.md',
  'skills/brainstorming/SKILL.md',
  'skills/test-driven-development/SKILL.md',
  'skills/subagent-driven-development/SKILL.md',
  'scripts/check-same-name-priority.mjs',
  'lib/superpowers.js',
  'cordis.patch.yml',
  'package.json',
]
for (const rel of checks) {
  const p = resolve(root, rel)
  try { await stat(p); console.log(`[verify] ✓ ${rel}`) } catch { console.error(`[verify] MISSING ${rel}`); ok = false }
}

console.log(`\n[verify] ${ok ? 'ALL PASS' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
