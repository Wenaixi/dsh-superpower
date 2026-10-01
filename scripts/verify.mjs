import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
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
// 资源契约检查：统一三种引用形态（相对链接 / 反引号目录路径 / 反引号裸文件名）
// 引用集合 ⊆ 技能目录文件集合；孤儿文件 WARN；示例文档白名单豁免
// ---------------------------------------------------------------------------

console.log('[verify] resource-contract check')

// 自检：提取器必须覆盖三种形态，且围栏代码块内的示例引用不得泄漏
function assertRefExtraction() {
  const sample = `见 [a](../using-superpowers/references/codex-tools.md)。先读 \`references/context-safety.md\` 与 \`implementer-prompt.md\`，再 \`bash scripts/review-package x\`。`
  const refs = extractRefs(sample)
  if (!refs.includes('../using-superpowers/references/codex-tools.md')) throw new Error('link form not extracted')
  if (!refs.includes('references/context-safety.md')) throw new Error('tick-path form not extracted')
  if (!refs.includes('implementer-prompt.md')) throw new Error('tick-bare form not extracted')
  const fenced = `\`\`bash\nscripts/tool.sh\n\`\`\``
  if (extractRefs(fenced).length !== 0) throw new Error('fenced example leaked into refs')
}

assertRefExtraction()

function extractRefs(mdContent) {
  // 去除围栏代码块，避免示例命令泄漏进引用域
  const stripped = mdContent.replace(/```[\s\S]*?```/g, '')
  const refs = new Set()
  // 形态 a：markdown 链接 [text](path) / [text](<path>)
  const linkRe = /\[[^\]]*\]\((<?)([^\)>\s]+)\1(?:\s+["'][^"']*["'])?\)/g
  let m
  while ((m = linkRe.exec(stripped)) !== null) {
    const t = m[2]
    if (!/^(https?:|mailto:|#)/.test(t)) refs.add(t)
  }
  // 形态 b：反引号目录路径 \`references/x.md\` / \`scripts/y.sh\`
  const tickPathRe = /\`((?:references|scripts|prompts|templates|examples)\/[\w./-]+)\`/g
  while ((m = tickPathRe.exec(stripped)) !== null) refs.add(m[1])
  // 形态 c：反引号裸文件名 \`x.md\`
  const tickBareRe = /\`([\w.-]+\.(?:md|js|ts|cjs|sh|html))\`/g
  while ((m = tickBareRe.exec(stripped)) !== null) refs.add(m[1])
  return [...refs]
}

// 示例文档白名单（正文中引用的路径是写作示例，非本仓文件承诺）
const REFERENCE_EXEMPT = new Set([
  // 写作示例文档：正文中引用的路径是教学示例，非本仓文件承诺
  'skills/writing-skills/anthropic-best-practices.md',
  // 视觉伴侣命名建议：提示用语义化文件名，非文件引用
  'skills/brainstorming/visual-companion.md',
  // diagnosing 运行时产物：scrub-log/诊断报告/时间线由 agent 运行生成，非仓内文件
  'skills/diagnosing-superpowers/prompts/scrub.md',
  'skills/diagnosing-superpowers/references/github-issues.md',
  'skills/diagnosing-superpowers/templates/bundle-README.md',
  // 示例测试：test-pressure 是上游遗留示例，无仓内 ts 测试
  'skills/systematic-debugging/test-pressure-2.md',
  // 跨技能引用：muse 平台映射引用 SDD 的 prompt 模板（存在于 subagent-driven-development/）
  'skills/using-superpowers/references/muse-tools.md',
  // 调用契约举例：writing-skills 教"必须用 bash/node 前缀"，tool.sh 为示例
  'skills/writing-skills/SKILL.md',
])

// 孤儿文件白名单（上游 v6.4.2 原样同步遗留，同步契约禁止删除/移动）
const ORPHAN_EXEMPT = new Set([
  'skills/brainstorming/spec-document-reviewer-prompt.md',
  'skills/systematic-debugging/test-pressure-1.md',
  'skills/systematic-debugging/test-pressure-2.md',
  'skills/systematic-debugging/test-pressure-3.md',
  'skills/systematic-debugging/test-academic.md',
  'skills/systematic-debugging/CREATION-LOG.md',
])


// 宿主约定文档名（运行时/宿主文件，非本仓文件承诺，不做存在性断言）
const HOST_DOCS = new Set(['SKILL.md', 'GEMINI.md', 'AGENTS.md', 'CLAUDE.md', 'SOUL.md', 'TODO.md', 'README.md'])
const RESOURCE_SUBS = ['references', 'prompts', 'templates', 'scripts', 'examples', '']

// 解析技能内引用：技能根 + 已知子目录逐级尝试；跨技能（../）按绝对路径解析
async function resolveRefInSkill(fileDir, ref) {
  if (ref.startsWith('../')) {
    return stat(resolve(fileDir, ref)).then(() => true).catch(() => false)
  }
  const base = ref.split('/').pop() || ref
  if (HOST_DOCS.has(base)) return true
  // 技能根：向上找含 SKILL.md 的目录
  let d = fileDir
  let root = fileDir
  while (true) {
    if (await stat(join(d, 'SKILL.md')).then(() => true).catch(() => false)) { root = d; break }
    const parent = dirname(d)
    if (parent === d) break
    d = parent
  }
  for (const sub of RESOURCE_SUBS) {
    const p = sub ? join(root, sub, ref) : join(root, ref)
    if (await stat(p).then(() => true).catch(() => false)) return true
  }
  return false
}

// 扫描技能目录：引用缺失（FAIL）与存在未引用（WARN），均跳过白名单
async function resolveResourceRefs(dir) {
  const missing = []
  const orphans = []
  const referenced = new Set()

  async function walk(d) {
    const list = await readdir(d, { withFileTypes: true })
    for (const item of list) {
      const full = join(d, item.name)
      const rel = relative(root, full).replace(/\\/g, '/')
      if (item.isDirectory()) {
        await walk(full)
      } else if (item.name.endsWith('.md')) {
        const content = await readFile(full, 'utf8')
        for (const ref of extractRefs(content)) {
          const clean = ref.replace(/#.*$/, '')
          if (!clean || REFERENCE_EXEMPT.has(rel)) continue
          if (!(await resolveRefInSkill(d, clean))) missing.push({ file: rel, ref })
        }
        // 该 md 文件本身若被引用，记为 referenced（basename 匹配）
        referenced.add(item.name)
      } else if (!item.name.endsWith('.md')) {
        continue
      }
    }
  }
  await walk(dir)

  // 孤儿：非 SKILL.md 且未出现在任何引用里，且不在白名单
  async function collectAll(d) {
    const list = await readdir(d, { withFileTypes: true })
    for (const item of list) {
      const full = join(d, item.name)
      const rel = relative(root, full).replace(/\\/g, '/')
      if (item.isDirectory()) await collectAll(full)
      else if (!item.name.endsWith('.md')) continue
      else if (item.name === 'SKILL.md') continue
      else if (!referenced.has(item.name) && !ORPHAN_EXEMPT.has(rel)) orphans.push(rel)
    }
  }
  await collectAll(dir)

  return { missing, orphans }
}

const { missing: missingRefs, orphans: orphanFiles } = await resolveResourceRefs(skillDir)
console.log(`[verify] missing refs: ${missingRefs.length}`)
for (const { file, ref } of missingRefs) {
  console.error(`[verify] MISSING REF ${file}: ${ref}`)
  ok = false
}
console.log(`[verify] unreferenced files: ${orphanFiles.length} WARN`)
for (const o of orphanFiles) console.log(`[verify] WARN unreferenced ${o}`)



// ---------------------------------------------------------------------------
// 随包脚本调用契约检查：技能正文里调用 scripts/* 必须带解释器前缀（bash/node），
// 裸路径会被部分宿主打包器剥掉可执行位而失败（writing-skills 契约原文）
// ---------------------------------------------------------------------------

console.log('[verify] bundled-script-call check')

// 反引号内裸脚本调用（`scripts/x.sh` 或 `../x/scripts/y.sh` 无前缀）
const bareCallRe = /`(?:(?:\.\.\/)?[\w-]+\/)*scripts\/[\w.\/-]+\.(?:sh|js|cjs|mjs)`/g
const prefixedOkRe = /`(?:bash|node|npx|python3?)\s+(?:(?:\.\.\/)?[\w-]+\/)*scripts\/[\w.\/-]+\.(?:sh|js|cjs|mjs)`/g

let bareCalls = 0
// 教学示例豁免：writing-skills/SKILL.md 本身就在讲这条契约，正文里的反例不算违规
const BARE_CALL_EXEMPT = new Set(['skills/writing-skills/SKILL.md'])
async function scanBareCalls(dir) {
  const list = await readdir(dir, { withFileTypes: true })
  for (const item of list) {
    if (item.name.startsWith('.')) continue
    const full = join(dir, item.name)
    if (item.isDirectory()) await scanBareCalls(full)
    else if (item.name.endsWith('.md')) {
      const relPath = relative(root, full).replace(/\\/g, '/')
      if (BARE_CALL_EXEMPT.has(relPath)) continue
      const content = await readFile(full, 'utf8')
      const stripped = content.replace(/```[\s\S]*?```/g, '')
      const bare = [...stripped.matchAll(bareCallRe)]
      // 前缀合法调用先行摘除，剩余裸调用才计
      for (const m of bare) {
        // 资源指针豁免：反引号目标是真实存在的文件（模板/客户端资源），非执行调用
        const targetPath = m[0].replace(/`/g, '')
        const realTarget = resolve(dir, targetPath)
        const isResource = await stat(realTarget).then(() => true).catch(() => false)
        if (isResource) continue
        if (!prefixedOkRe.test(m[0])) {
          console.error(`[verify] BARE SCRIPT CALL ${relative(root, full)}: ${m[0]}`)
          bareCalls++
          ok = false
        }
      }
    }
  }
}
await scanBareCalls(skillDir)
console.log(`[verify] bundled-script-call check ${bareCalls === 0 ? 'PASS' : 'FAIL: ' + bareCalls + ' bare call(s)'}`)
if (bareCalls === 0) console.log('')
// ---------------------------------------------------------------------------
// 深度接口边界自检：SkillDocument/SkillCatalog 的契约断言（接口即测试表面）
// 8 条断言覆盖 BOM/CRLF/kebab/必填字段/排重/名称漂移/中止语义
// ---------------------------------------------------------------------------

console.log('[verify] boundary self-check')

const boundaryResults = []
const boundaryCheck = async (name, fn) => {
  try { await fn(); boundaryResults.push('OK ' + name) }
  catch (e) { boundaryResults.push('FAIL ' + name + ' — ' + (e?.message ?? e)) }
}

await boundaryCheck('BOM 剥离', () => {
  const d = SkillDocument.fromString('\uFEFF---\nname: bom-test\ndescription: d\n---\nbody')
  if (d.name !== 'bom-test') throw new Error('BOM 未剥离: ' + JSON.stringify(d.name))
})

await boundaryCheck('CRLF 归一', () => {
  const d = SkillDocument.fromString('---\r\nname: crlf-test\r\ndescription: d\r\n---\r\nbody')
  if (d.body.trim() !== 'body') throw new Error('CRLF 归一失败: ' + JSON.stringify(d.body))
})

await boundaryCheck('kebab 校验', () => {
  let threw = null
  try { SkillDocument.fromString('---\nname: Not_Kebab\ndescription: d\n---\n') } catch (e) { threw = e }
  if (!threw || !/kebab/.test(String(threw.message))) throw new Error('未抛 kebab 错误: ' + threw?.message)
})

await boundaryCheck('缺 name 报错', () => {
  let threw = null
  try { SkillDocument.fromString('---\ndescription: d\n---\n') } catch (e) { threw = e }
  if (!threw || !/name/.test(String(threw.message))) throw new Error('未抛缺 name 错误: ' + threw?.message)
})

await boundaryCheck('缺 description 报错', () => {
  let threw = null
  try { SkillDocument.fromString('---\nname: x-test\n---\n') } catch (e) { threw = e }
  if (!threw || !/description/.test(String(threw.message))) throw new Error('未抛缺 description 错误: ' + threw?.message)
})

await boundaryCheck('目录排重', async () => {
  const base = await mkdtemp(join(tmpdir(), 'sp-dup-'))
  const md = '---\nname: same-name\ndescription: d\n---\nbody'
  await mkdir(join(base, 'alpha')); await mkdir(join(base, 'bravo'))
  await Promise.all([writeFile(join(base, 'alpha', 'SKILL.md'), md), writeFile(join(base, 'bravo', 'SKILL.md'), md)])
  const cat = await SkillCatalog.fromDirectory(base)
  if (cat.verifyIntegrity().duplicates.length !== 1) throw new Error('duplicates != 1')
  await rm(base, { recursive: true, force: true })
})

await boundaryCheck('name drift', async () => {
  const base = await mkdtemp(join(tmpdir(), 'sp-drift-'))
  await mkdir(join(base, 'dir-name'))
  await writeFile(join(base, 'dir-name', 'SKILL.md'), '---\nname: other-name\ndescription: d\n---\nbody')
  const cat = await SkillCatalog.fromDirectory(base)
  if (!cat.verifyIntegrity().entries[0]?.nameDrift) throw new Error('nameDrift 未生效')
  await rm(base, { recursive: true, force: true })
})

await boundaryCheck('abort 中止', async () => {
  const ctrl = new AbortController()
  ctrl.abort()
  let threw = null
  try { await SkillDocument.fromFile('whatever.md', ctrl.signal) } catch (e) { threw = e }
  if (!threw || threw.name !== 'AbortError') throw new Error('未抛 AbortError: ' + (threw?.name ?? '无'))
})

for (const line of boundaryResults) console.log('[verify]   ' + line)
const boundaryPass = boundaryResults.filter((l) => l.startsWith('OK')).length
console.log(`[verify] boundary self-check ${boundaryPass}/8 PASS`)
if (boundaryPass !== 8) { ok = false; console.error('[verify] boundary self-check FAIL') } else { console.log('') }
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