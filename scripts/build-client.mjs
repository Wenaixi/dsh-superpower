/**
 * @wenaixi/dsh-superpower — 客户端产物构建脚本
 *
 * 职责两件：
 * 1. 在复制前校验 src/client.js 内联的技能清单与 skills/ 目录一致，防止 UI 画出磁盘上不存在的行；
 * 2. 把手写源原样复制到 lib/client.js。
 *
 * 为什么是复制而不是打包：DSH 客户端要求 CJS factory 形态的同步导出，tsc 无法产出；
 * 引入 tsdown 只为产出这一种形态并不划算。全仓只允许这一个来源，tsconfig 已排除该文件。
 */

import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertClientManifest } from './lib/client-manifest.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src', 'client.js')
const target = join(root, 'lib', 'client.js')

const { skills, issues } = await assertClientManifest(root)
if (issues.length > 0) {
  for (const issue of issues) console.error('[build-client] ' + issue)
  console.error('[build-client] FAIL: 客户端静态清单与 skills/ 目录不一致，未产出 lib/client.js')
  process.exit(1)
}

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
console.log('[build-client] OK ' + skills.length + ' skills -> lib/client.js')
