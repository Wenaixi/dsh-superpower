import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'skills')
console.log(`[verify] skillDir: ${skillDir}`)

const entries = await readdir(skillDir, { withFileTypes: true })
const skillDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name).sort()
console.log(`[verify] found ${skillDirs.length} skill directories: ${skillDirs.join(', ')}`)

let ok = true
for (const dir of skillDirs) {
  const p = join(skillDir, dir, 'SKILL.md')
  try { await stat(p) } catch { console.error(`[verify] MISSING ${p}`); ok = false; continue }
  const raw = await readFile(p, 'utf8')
  const hasFrontmatter = raw.startsWith('---\n') && raw.includes('\n---\n')
  const nameMatch = raw.match(/name:\s*([a-z0-9-]+)/)
  const descMatch = raw.match(/description:\s*["']?(.+)["']?/)
  if (!hasFrontmatter) { console.error(`[verify] ${dir}: missing frontmatter`); ok = false }
  else if (!nameMatch) { console.error(`[verify] ${dir}: missing name`); ok = false }
  else console.log(`[verify] ✓ ${dir} -> ${nameMatch[1]} ${descMatch ? `(${descMatch[1].slice(0,60)})` : ''}`)
}

// 额外检查 Provider 能否 list（不依赖完整 DSH boot，仅测试文件解析）
console.log(`\n[verify] expected 14 skills, found ${skillDirs.length} -> ${skillDirs.length === 14 ? 'PASS' : 'FAIL'}`)
if (skillDirs.length !== 14) ok = false

// 检查关键文件
const checks = [
  'skills/using-superpowers/references/dsh-tools.md',
  'skills/brainstorming/SKILL.md',
  'skills/test-driven-development/SKILL.md',
  'skills/subagent-driven-development/SKILL.md',
  'lib/superpowers.js',
  'cordis.patch.yml',
  'package.json',
]
for (const rel of checks) {
  const p = resolve(dirname(fileURLToPath(import.meta.url)), '..', rel)
  try { await stat(p); console.log(`[verify] ✓ ${rel}`) } catch { console.error(`[verify] MISSING ${rel}`); ok = false }
}

console.log(`\n[verify] ${ok ? 'ALL PASS' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
