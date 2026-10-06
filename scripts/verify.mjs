/**
 * @wenaixi/dsh-superpower — 全量质量门禁与契约验证调度器
 *
 * 统筹调度：
 * 1. SkillCatalog 编目与目录健康度校验（15 技能、无重名、无漂移）
 * 2. SkillContractChecker 契约检查（死链、资源引用、孤儿文件、脚本调用守卫、
 *    随包 shell 脚本健全性、自建服务禁令）
 * 3. SkillDocument / SkillCatalog 核心边界自检
 * 4. 全仓无 Emoji / 图形状态符号硬扫描
 * 5. 核心依赖文件存在性断言
 */

import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { SkillCatalog, SkillDocument, EXPECTED_SKILL_COUNT } from '../lib/superpowers.js'
import { SkillContractChecker } from './lib/contract.mjs'
import { assertClientManifest } from './lib/client-manifest.mjs'

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

if (report.total !== EXPECTED_SKILL_COUNT) {
  console.error(`[verify] expected ${EXPECTED_SKILL_COUNT} skills, found ${report.total}`)
  ok = false
} else {
  console.log(`\n[verify] expected ${EXPECTED_SKILL_COUNT} skills, found ${report.total} -> PASS\n`)
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

// (2.4) 随包 shell 脚本的 Shebang 与行尾自检
console.log('[verify] bundled-shell-scripts check')
const shellResults = contract.checkBundledShellScripts()
let shellOk = true
for (const sr of shellResults) {
  if (sr.ok) {
    console.log(`[verify]   OK ${sr.file}`)
  } else {
    console.error(`[verify]   FAIL ${sr.file}: ${sr.error}`)
    shellOk = false
    ok = false
  }
}
console.log(`[verify] bundled-shell-scripts check ${shellOk ? 'PASS' : 'FAIL'}\n`)

// (2.45) 技能正文不得复活自建 HTTP 服务（可视化已走宿主官方文档预览）
console.log('[verify] self-hosted-service check')
const serviceHits = await contract.checkNoSelfHostedService()
for (const hit of serviceHits) {
  console.error(`[verify] SELF-HOSTED SERVICE ${hit.file} 仍引用 ${hit.marker}`)
}
console.log(`[verify] self-hosted-service check ${serviceHits.length === 0 ? 'PASS' : 'FAIL'}\n`)
if (serviceHits.length > 0) ok = false

// (2.47) README 语言面契约
console.log('[verify] readme-language check')
const readmeIssues = contract.checkReadmeLanguage()
for (const ri of readmeIssues) {
  console.error('[verify] README ' + ri)
}
console.log('[verify] readme-language check ' + (readmeIssues.length === 0 ? 'PASS' : 'FAIL: ' + readmeIssues.length + ' issue(s)') + '\n')
if (readmeIssues.length > 0) ok = false

// (2.46) 技能文件双语契约：SKILL.md 同时声明英文 description 与中文 description_zh
console.log('[verify] bilingual-pairing check')
const bilingualIssues = await contract.checkBilingualPairing()
for (const bi of bilingualIssues) {
  console.error('[verify] BILINGUAL ' + bi)
}
console.log('[verify] bilingual-pairing check ' + (bilingualIssues.length === 0 ? 'PASS' : 'FAIL: ' + bilingualIssues.length + ' issue(s)') + '\n')
if (bilingualIssues.length > 0) ok = false

// (2.5) 客户端半侧产物形态与命名空间一致性（语法、CJS factory、patch id 对齐）
console.log('[verify] client-artifact check')
const clientResults = contract.checkClientArtifact()
for (const cr of clientResults) {
  if (cr.ok) {
    console.log(`[verify]   OK ${cr.file}`)
  } else {
    console.error(`[verify]   FAIL ${cr.file}: ${cr.error}`)
    ok = false
  }
}
const clientOk = clientResults.length > 0 && clientResults.every((cr) => cr.ok)
console.log(`[verify] client-artifact check ${clientOk ? 'PASS' : 'FAIL'}\n`)

console.log('[verify] client source/artifact consistency check')
const clientManifest = await assertClientManifest(root)
for (const issue of clientManifest.issues) {
  console.error(`[verify] FAIL ${issue}`)
  ok = false
}
console.log(`[verify] client source/artifact consistency ${clientManifest.issues.length === 0 ? 'PASS' : 'FAIL'}\n`)

// ---------------------------------------------------------------------------
// 3. 深度接口边界自检：由 SkillCatalog.verifySpecification() 提供自包含规范报告（接口即测试表面）
// ---------------------------------------------------------------------------

console.log('[verify] boundary self-check (via SkillCatalog.verifySpecification)')

const specReport = await SkillCatalog.verifySpecification()
for (const res of specReport.results) {
  if (res.ok) {
    console.log(`[verify]   OK ${res.name}`)
  } else {
    console.error(`[verify]   FAIL ${res.name} — ${res.error}`)
    ok = false
  }
}
console.log(`[verify] boundary self-check ${specReport.passed}/${specReport.total} ${specReport.ok ? 'PASS' : 'FAIL'}\n`)
if (!specReport.ok) ok = false

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

// 存在性清单只保留真实增量价值：门禁脚本自身被误删时能红。
// 技能路径交给第 1 段 missingSkillMd 检查；lib/*.js 由构建链保证；package.json 恒真。
const required = [
  'scripts/check-same-name-priority.mjs',
  'scripts/lib/contract.mjs',
  'scripts/lib/sync-engine.mjs',
  'lib/superpowers.js',
  'lib/document.js',
  'lib/switches.js',
  'lib/client.js',
  'src/client.js',
  'scripts/build-client.mjs',
  'scripts/lib/client-manifest.mjs',
  'cordis.patch.yml',
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