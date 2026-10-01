/**
 * @wenaixi/dsh-superpower — 全量质量门禁与契约验证调度器
 *
 * 统筹调度：
 * 1. SkillCatalog 编目与目录健康度校验（15 技能、无重名、无漂移）
 * 2. SkillContractChecker 契约检查（死链、资源引用、孤儿文件、脚本调用守卫）
 * 3. Visual Companion 随包脚本语法与健全性检查
 * 4. SkillDocument / SkillCatalog 核心边界自检
 * 5. 全仓无 Emoji / 图形状态符号硬扫描
 * 6. 核心依赖文件存在性断言
 */

import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { SkillCatalog, SkillDocument } from '../lib/superpowers.js'
import { SkillContractChecker } from './lib/contract.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillDir = join(root, 'skills')

console.log('[verify] skillDir:', skillDir)

let ok = true

// ---------------------------------------------------------------------------
// 1. 基于 SkillCatalog 深度模块进行严格的编目发现与健康度校验
// ---------------------------------------------------------------------------

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
// 2. 内容与引用契约治理（委托 SkillContractChecker 深度模块）
// ---------------------------------------------------------------------------

const contract = new SkillContractChecker(root)

// 契约守卫真实可失败自检（证明规则不是假绿）
contract.assertGuardCanFail()

// (2.1) 相对引用死链检查
console.log('[verify] relative-reference check')
const deadLinks = await contract.checkRelativeLinks()
if (deadLinks.length === 0) {
  console.log('[verify] relative-reference check PASS\n')
} else {
  for (const dl of deadLinks) {
    console.error(`[verify] DEAD LINK in ${dl.file}: ${dl.target} -> ${dl.resolved}`)
  }
  console.error(`[verify] relative-reference check FAIL: ${deadLinks.length} dead link(s)\n`)
  ok = false
}

// (2.2) 资源契约检查（两遍扫描 + 孤儿文件白名单）
console.log('[verify] resource-contract check')
const { missing: missingRefs, orphans: orphanFiles } = await contract.checkResourceRefs()
console.log(`[verify] missing refs: ${missingRefs.length}`)
for (const { file, ref } of missingRefs) {
  console.error(`[verify] MISSING REF ${file}: ${ref}`)
  ok = false
}
console.log(`[verify] unreferenced files: ${orphanFiles.length} WARN`)
for (const o of orphanFiles) {
  console.log(`[verify] WARN unreferenced ${o}`)
}
console.log('')

// (2.3) 随包脚本调用守卫（必须带 bash/node 前缀）
console.log('[verify] bundled-script-call check')
const bareCalls = await contract.checkBareScriptCalls()
for (const bc of bareCalls) {
  console.error(`[verify] BARE SCRIPT CALL ${bc.file}: ${bc.call}`)
}
console.log(`[verify] bundled-script-call check ${bareCalls.length === 0 ? 'PASS' : 'FAIL: ' + bareCalls.length + ' bare call(s)'}\n`)
if (bareCalls.length > 0) ok = false

// (2.4) Visual Companion 随包脚本健全性自检（闭合候选 2 测试表面）
console.log('[verify] companion-scripts syntax check')
const companionResults = contract.checkCompanionScripts()
let companionOk = true
for (const cr of companionResults) {
  if (cr.ok) {
    console.log(`[verify]   OK ${cr.file}`)
  } else {
    console.error(`[verify]   FAIL ${cr.file}: ${cr.error}`)
    companionOk = false
    ok = false
  }
}
console.log(`[verify] companion-scripts check ${companionOk ? 'PASS' : 'FAIL'}\n`)

// ---------------------------------------------------------------------------
// 3. 深度接口边界自检：SkillDocument/SkillCatalog 契约断言（接口即测试表面）
// ---------------------------------------------------------------------------

console.log('[verify] boundary self-check')

const boundaryResults = []
const boundaryCheck = async (name, fn) => {
  try {
    await fn()
    boundaryResults.push('OK ' + name)
  } catch (e) {
    boundaryResults.push('FAIL ' + name + ' — ' + (e?.message ?? e))
  }
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
  await mkdir(join(base, 'alpha'))
  await mkdir(join(base, 'bravo'))
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
if (boundaryPass !== 8) {
  ok = false
  console.error('[verify] boundary self-check FAIL')
} else {
  console.log('')
}

// ---------------------------------------------------------------------------
// 4. 全仓无 Emoji / 图形状态符号硬扫描（符号契约）
// ---------------------------------------------------------------------------

console.log('[verify] emoji/symbol check')
const symbolViolations = await contract.checkSymbols([
  'skills',
  'README.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'docs',
])

if (symbolViolations.length === 0) {
  console.log('[verify] emoji/symbol check PASS\n')
} else {
  for (const v of symbolViolations) {
    console.error(`[verify] SYMBOL VIOLATION in ${v.file}:${v.line} (char "${v.char}", code ${v.code}): ${v.text}`)
  }
  console.error(`[verify] emoji/symbol check FAIL: ${symbolViolations.length} violation(s)\n`)
  ok = false
}

// ---------------------------------------------------------------------------
// 5. 核心关键文件存在性校验
// ---------------------------------------------------------------------------

const required = [
  'skills/using-superpowers/references/dsh-tools.md',
  'skills/diagnosing-superpowers/SKILL.md',
  'skills/brainstorming/SKILL.md',
  'skills/test-driven-development/SKILL.md',
  'skills/subagent-driven-development/SKILL.md',
  'scripts/check-same-name-priority.mjs',
  'scripts/lib/contract.mjs',
  'scripts/lib/sync-engine.mjs',
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
