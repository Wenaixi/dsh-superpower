/**
 * 双包名变体打包：以同一份源码生成另一个包名的 npm tarball。
 *
 * 背景：本仓库同时维护 scoped 包名与无 scope 包名，两者内容一致、版本同号。
 * 直接复制 package.json 会漂移，所以在临时目录里重建产物，工作树保持干净。
 *
 * 用法：node scripts/pack-variant.mjs <目标包名>
 * 产物：<临时目录>/<包名>-<版本>.tgz，脚本末行打印绝对路径。
 *
 * 关键约束（源码实证 @deepseek-ai/dsh-app-boot）：
 * - cordis.patch.yml 的 name 必须等于安装后的包名，否则 resolveBundleDir 抛错；
 * - 客户端产物 id 必须等于安装后的包名，否则宿主拒绝注册；
 * - 因此三处（package.json name、patch name、客户端产物）必须同步改写。
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const targetName = process.argv[2]
if (typeof targetName !== 'string' || targetName.length === 0) {
  console.error('[pack-variant] 用法：node scripts/pack-variant.mjs <目标包名>')
  process.exit(2)
}

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const sourceName = manifest.name
const version = manifest.version
if (targetName === sourceName) {
  console.error('[pack-variant] 目标包名与当前包名相同，变体打包无意义')
  process.exit(2)
}

// 只复制 files 白名单内的内容，外加构建与清单文件；不复制 node_modules 与 .git
const staged = mkdtempSync(join(tmpdir(), 'dsh-variant-'))
const cleanup = () => rmSync(staged, { recursive: true, force: true })
process.on('exit', cleanup)

function stagePath(relative) {
  const source = join(root, relative)
  if (!existsSync(source)) return false
  const target = join(staged, relative)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target, { recursive: true, dereference: true })
  return true
}

// 目录清单取自 package.json files，外加构建必需项
const always = ['package.json', 'cordis.patch.yml', 'LICENSE', 'README.md', 'CHANGELOG.md', 'README.zh.md', 'README.zh-CN.md', 'icon.png', 'tsconfig.build.json', 'tsconfig.json']
for (const entry of [...(manifest.files ?? []), ...always]) {
  stagePath(entry.replace(/\/$/, ''))
}
stagePath('scripts')
stagePath('src')

// 构建链依赖 node_modules（tsc 与 client-manifest 模块解析），用链接避免整树拷贝
const modules = join(root, 'node_modules')
if (existsSync(modules)) symlinkSync(modules, join(staged, 'node_modules'), 'junction')

// 1) 改写 package.json 的 name
const stagedManifestPath = join(staged, 'package.json')
const stagedManifest = JSON.parse(readFileSync(stagedManifestPath, 'utf8'))
stagedManifest.name = targetName
writeFileSync(stagedManifestPath, JSON.stringify(stagedManifest, null, 2) + '\n')

// 2) 改写 cordis.patch.yml 的 name（只替换包名行，保留其余结构）
const patchPath = join(staged, 'cordis.patch.yml')
const patch = readFileSync(patchPath, 'utf8')
const nextPatch = patch.split(`name: "${sourceName}"`).join(`name: "${targetName}"`).split(`name: '${sourceName}'`).join(`name: '${targetName}'`)
if (nextPatch === patch) {
  console.error(`[pack-variant] FAIL: cordis.patch.yml 中未找到 name: "${sourceName}"`)
  process.exit(1)
}
writeFileSync(patchPath, nextPatch)

// 3) 在临时目录重新构建客户端产物，使 id 等于目标包名
execFileSync(process.execPath, [join(staged, 'scripts', 'build-client.mjs')], { cwd: staged, stdio: 'inherit' })

// 4) 自检：功能性位置必须等于目标包名。
// 只查两处真正参与运行时寻址的赋值：
//   - window.__ModuleLoader__.load 的顶层 id（文件开头那段）
//   - 包名常量 PACKAGE_NAME
// 其余行首 id 是 UI 元素标识（如 spSwLang），与包名无关，不能误判。
const artifact = readFileSync(join(staged, 'lib', 'client.js'), 'utf8')
// loader 调用与 id 之间可能夹注释行，允许中间出现任意非花括号内容
const loaderId = artifact.match(/__ModuleLoader__\.load\(\{[^}]*?\bid:\s*(['"])(.*?)\1/)?.[2]
const packageConstant = artifact.match(/^\s*var PACKAGE_NAME = (['"])(.*?)\1/m)?.[2]
const runtimeIds = [loaderId, packageConstant].filter((value) => typeof value === 'string')
if (runtimeIds.length !== 2) {
  console.error(`[pack-variant] FAIL: 运行时包名定位失败（loader id=${loaderId}，常量=${packageConstant}）`)
  process.exit(1)
}
for (const value of runtimeIds) {
  if (value !== targetName) {
    console.error(`[pack-variant] FAIL: 运行时包名仍为 ${value}，应为 ${targetName}`)
    process.exit(1)
  }
}
if (readFileSync(patchPath, 'utf8').includes(sourceName)) {
  console.error('[pack-variant] FAIL: cordis.patch.yml 仍含源包名')
  process.exit(1)
}

// 5) 打包到临时目录，打印绝对路径供 CI 取用。
// Windows 下 npm 是 npm.cmd，execFileSync 直接调会 ENOENT，因此走 shell 解析。
const outDir = join(staged, '..', `dsh-variant-out-${version}`)
mkdirSync(outDir, { recursive: true })
const packed = execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', outDir], { cwd: staged, encoding: 'utf8', shell: true }).trim().split('\n').pop()
const tarball = join(outDir, packed)
if (!existsSync(tarball)) {
  console.error('[pack-variant] FAIL: tarball 未生成')
  process.exit(1)
}

console.log(tarball)
