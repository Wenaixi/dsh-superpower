/**
 * 上游同步复核共享引擎（review-sync 三件套的唯一契约实现）。
 *
 * review-sync-deep / review-sync-fences / review-sync-tokens 三个脚本
 * 曾经各自复制 norm、fenceRe、walk 等实现，任何契约调整都要同步改三处。
 * 本模块把全部同步契约内聚于此：改契约先改这里，三个消费脚本零改动。
 *
 * 用法：import { norm, fenceRe, splitBlocks, walkMd, splitComment, hasCJK, syncSkillsList } from './lib/sync-common.mjs'
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** CRLF/CR 归一为 LF（三脚本原实现逐字一致）。 */
export const norm = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

/** 围栏代码块正则（三脚本原实现逐字一致）。 */
export const fenceRe = /```(\w*)[^\n]*\n([\s\S]*?)```/g

/** 围栏代码块切分：返回 [{ lang, body }]。 */
export const splitBlocks = (s) => [...s.matchAll(fenceRe)].map((m) => ({ lang: m[1], body: m[2] }))

/**
 * 递归收集目录下全部 .md 文件的相对路径（tokens 原实现语义：
 * 仅 .md、相对路径、斜杠归一、不排序）。deep 需要全文件树，
 * 故 deep 保留自己的 walkTree（含 sort 与全部文件），本函数供 tokens/fences 使用。
 */
export async function walkMd(dir, base = dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walkMd(p, base)))
    else if (e.name.endsWith('.md')) out.push(p.slice(base.length + 1).replace(/\\/g, '/'))
  }
  return out
}

/** 一行内：`#` 之后视为注释（仅行首/前置空白后出现 # 才切）。 */
export const splitComment = (line) => {
  const m = line.match(/^([^#]*?)(\s+#.*)$/)
  return m ? [m[1].replace(/\s+$/, ''), m[2]] : [line, '']
}

/** 是否含 CJK 字符（判断本地化正文）。 */
export const hasCJK = (s) => /[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(s)

/**
 * 从上游目录动态派生全部技能的 SKILL.md 相对路径（供 fences 清单使用）。
 * 替代硬编码 13 技能清单，新增技能自动覆盖。
 */
export async function syncSkillsList(upstreamDir) {
  const all = await walkMd(upstreamDir)
  return all.filter((rel) => rel.endsWith('/SKILL.md')).sort()
}

export { SyncEngine } from './sync-engine.mjs'
