/**
 * @wenaixi/dsh-superpower — 客户端产物构建脚本
 *
 * 职责三件：
 * 1. 在复制前校验 src/client.js 内联的技能清单与 skills/ 目录一致，防止 UI 画出磁盘上不存在的行；
 * 2. 把包名占位符 @@PACKAGE_NAME@@ 按 package.json 的 name 替换，再写入 lib/client.js；
 * 3. 断言产物中不再残留占位符。
 *
 * 为什么用占位符：宿主按安装后的包名逐字校验客户端模块 id、RPC 命名空间与插槽 key。
 * 双包名发布（scoped 与无 scope 同源）时，产物必须跟着包名走，硬编码会让变体包加载失败。
 * 包名只从 package.json 读取，避免第二处真源。
 *
 * 为什么是复制而不是打包：DSH 客户端要求 CJS factory 形态的同步导出，tsc 无法产出；
 * 引入 tsdown 只为产出这一种形态并不划算。全仓只允许这一个来源，tsconfig 已排除该文件。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PACKAGE_NAME_PLACEHOLDER,
  assertClientManifest,
  checkSkillCatalogDrift,
  renderPackageName,
} from './lib/client-manifest.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src', 'client.js')
const target = join(root, 'lib', 'client.js')
const packageName = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name
if (typeof packageName !== 'string' || packageName.length === 0) {
  console.error('[build-client] FAIL: package.json 缺少 name')
  process.exit(1)
}

/* 安全原子时序：
   1. 先校验 src/client.js 与 skills/ 目录是否漂移；若有漂移立即退出，不触碰磁盘，防止污染产物；
   2. 确认零漂移后替换占位符并写入 lib/client.js；
   3. 最后调用 assertClientManifest 确认产物落地同步。 */
const drift = await checkSkillCatalogDrift(root)
if (drift.length > 0) {
  for (const issue of drift) console.error('[build-client] ' + issue)
  console.error('[build-client] FAIL: 客户端内联清单与 skills/ 目录存在漂移')
  process.exit(1)
}

const rendered = renderPackageName(readFileSync(source, 'utf8'), packageName)
if (rendered.includes(PACKAGE_NAME_PLACEHOLDER)) {
  console.error('[build-client] FAIL: 占位符替换后仍有残留')
  process.exit(1)
}

mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, rendered)

const { skills, issues } = await assertClientManifest(root)
if (issues.length > 0) {
  for (const issue of issues) console.error('[build-client] ' + issue)
  console.error('[build-client] FAIL: 客户端静态清单与 skills/ 目录不一致')
  process.exit(1)
}

console.log('[build-client] OK ' + skills.length + ' skills -> lib/client.js')
