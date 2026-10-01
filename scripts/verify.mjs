import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SkillCatalog, SkillDocument } from '../lib/superpowers.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillDir = join(root, 'skills')

console.log('[verify] skillDir:', skillDir)

let ok = true

// 基于 SkillCatalog 深度模块进行严格的编目发现与健康度校验，与运行时逻辑完全对齐
const catalog = await SkillCatalog.fromDirectory(skillDir)
const report = catalog.verifyIntegrity()

console.log(`[verify] found ${report.total} skills`)

for (const entry of report.entries) {
  if (entry.nameDrift) {
    console.error(`[verify] ${entry.directoryName}: name drift (frontmatter "${entry.document.name}" != dir "${entry.directoryName}")`)
    ok = false
  } else {
    console.log(`[verify] OK ${entry.directoryName} (${entry.document.description.slice(0, 50)})`)
  }
}

for (const missing of report.missingSkillMd) {
  console.error(`[verify] missing SKILL.md in directory: ${missing}`)
  ok = false
}

for (const err of report.errors) {
  console.error(`[verify] ${err.path}: 解析失败 — ${err.error}`)
  ok = false
}

for (const dup of report.duplicates) {
  console.error(`[verify] duplicate skill name: ${dup}`)
  ok = false
}

if (report.total !== 15) {
  console.error(`[verify] expected 15 skills, found ${report.total}`)
  ok = false
} else {
  console.log('\n[verify] expected 15 skills, found 15 -> PASS\n')
}

// ---------------------------------------------------------------------------
// 相对引用存活性检查：扫描 skills/**/*.md 中的相对路径引用，跳过代码块
// ---------------------------------------------------------------------------

console.log('[verify] relative-reference check')
let deadLinks = 0

function extractRelativeLinks(mdContent) {
  // 去除围栏代码块，避免误报代码中的相对路径
  const stripped = mdContent.replace(/```[\s\S]*?```/g, '')
  const links = []
  // 匹配形如 [text](path) 或 [text](<path>)
  const re = /\[[^\]]*\]\((<?)([^>\)\s]+)\1(?:\s+["'][^"']*["'])?\)/g
  let m
  while ((m = re.exec(stripped)) !== null) {
    const target = m[2]
    if (/^(https?:|mailto:|#)/.test(target)) continue
    links.push(target)
  }
  return links
}

async function checkRelativeLinks(dir) {
  const list = await readdir(dir, { withFileTypes: true })
  for (const item of list) {
    const full = join(dir, item.name)
    if (item.isDirectory()) {
      await checkRelativeLinks(full)
    } else if (item.name.endsWith('.md')) {
      const content = await readFile(full, 'utf8')
      const targets = extractRelativeLinks(content)
      for (const target of targets) {
        // 去除可能的锚点
        const clean = target.replace(/#.*$/, '')
        if (!clean) continue
        const resolved = resolve(dir, clean)
        try {
          await stat(resolved)
        } catch {
          console.error(`[verify] DEAD LINK in ${relative(root, full)}: ${target} -> ${relative(root, resolved)}`)
          deadLinks++
          ok = false
        }
      }
    }
  }
}

await checkRelativeLinks(skillDir)
if (deadLinks === 0) {
  console.log('[verify] relative-reference check PASS\n')
} else {
  console.error(`[verify] relative-reference check FAIL: ${deadLinks} dead link(s)\n`)
}

// ---------------------------------------------------------------------------
// 全仓无 emoji / 图形状态符号硬扫描（符号契约）
// 范围：skills/ 全文件（含 .sh/.ts/.js 等）、根文档（README/CONTRIBUTING/CHANGELOG 等）、docs/
// 规则：发现任何 emoji 或图形状态符号即退出并标记 FAIL
// ---------------------------------------------------------------------------

console.log('[verify] emoji/symbol check')
// 常用状态符号范围（对勾、叉号、警示三角、圆圈符号等）
const SYMBOL_PATTERN = /[\u2700-\u27BF\u2600-\u26FF\u2300-\u23FF\u2B50-\u2B55\u{1F300}-\u{1FAFF}]/u
let symbolViolations = 0

async function scanFileForSymbols(filePath) {
  const content = await readFile(filePath, 'utf8')
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (SYMBOL_PATTERN.test(line)) {
      const match = line.match(SYMBOL_PATTERN)
      console.error(`[verify] SYMBOL VIOLATION in ${relative(root, filePath)}:${i + 1} (char "${match[0]}", code 0x${match[0].codePointAt(0).toString(16)}): ${line.trim().slice(0, 80)}`)
      symbolViolations++
      ok = false
    }
  }
}

async function scanDirForSymbols(dir) {
  const list = await readdir(dir, { withFileTypes: true })
  for (const item of list) {
    if (item.name.startsWith('.') || item.name === 'node_modules') continue
    const full = join(dir, item.name)
    if (item.isDirectory()) {
      await scanDirForSymbols(full)
    } else {
      await scanFileForSymbols(full)
    }
  }
}

// 扫描 skills/ 全文件
await scanDirForSymbols(skillDir)

// 扫描根目录关键文档
const rootDocs = ['README.md', 'CONTRIBUTING.md', 'CHANGELOG.md']
for (const doc of rootDocs) {
  const p = join(root, doc)
  try {
    await stat(p)
    await scanFileForSymbols(p)
  } catch {
    // 文档不存在则跳过
  }
}

// 扫描 docs/ 目录（如存在）
const docsDir = join(root, 'docs')
try {
  const st = await stat(docsDir)
  if (st.isDirectory()) await scanDirForSymbols(docsDir)
} catch {
  // docs 不存在则跳过
}

if (symbolViolations === 0) {
  console.log('[verify] emoji/symbol check PASS')
} else {
  console.error(`[verify] emoji/symbol check FAIL: ${symbolViolations} violation(s)\n`)
}

// 核心文件存在性校验
const required = [
  'skills/using-superpowers/references/dsh-tools.md',
  'skills/diagnosing-superpowers/SKILL.md',
  'skills/brainstorming/SKILL.md',
  'skills/test-driven-development/SKILL.md',
  'skills/subagent-driven-development/SKILL.md',
  'scripts/check-same-name-priority.mjs',
  'lib/superpowers.js',
  'lib/document.js',
  'cordis.patch.yml',
  'package.json',
]

for (const f of required) {
  try {
    await stat(join(root, f))
    console.log(`[verify] OK ${f}`)
  } catch {
    console.error(`[verify] MISSING ${f}`)
    ok = false
  }
}

if (!ok) {
  console.error('\n[verify] FAILED')
  process.exit(1)
} else {
  console.log('\n[verify] ALL PASS')
}