/**
 * DSH 测试骨架共享引擎（check-same-name-priority 双脚本的公共样板）。
 *
 * 两个 priority 实测脚本曾经各自复制 check/freshRegistry/exitByFailed 三件套；
 * 本模块把它们收敛为唯一实现。断言语义改动先改这里，双脚本零改动。
 *
 * 用法：
 *   import { check, freshRegistry, exitByFailed } from './lib/harness-common.mjs'
 *   const state = { failed: 0 }
 *   check('标签', actual, expected, state)
 *   exitByFailed('插件优先级实测', state)   // 末尾调用，按 failed 数决定 exit code
 */

import { Context } from '@deepseek-ai/cordis'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'

/**
 * 断言一条测试：actual 与 expected 相等为 PASS，否则 FAIL 并计入 state.failed。
 * 不立即抛出，全部跑完后由 exitByFailed 统一收尾。
 */
export function check(state, label, actual, expected) {
  const ok = actual === expected
  if (!ok) state.failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${actual}${ok ? '' : ` (期望 ${expected})`}`)
  return ok
}

/** 建立一个装载 SkillRegistry 的全新 Cordis 上下文（每次测试独立，避免注册残留）。 */
export async function freshRegistry() {
  const ctx = new Context()
  await ctx.plugin(SkillRegistry)
  return ctx
}

/**
 * 收尾：按累计失败数输出结论并设置退出码（0 全过 / 1 有失败）。
 * 返回失败数，供调用方进一步使用。
 */
export function exitByFailed(title, state) {
  const n = state.failed
  console.log(n === 0 ? `\n${title}：全部通过` : `\n${title}：${n} 项失败`)
  process.exitCode = n === 0 ? 0 : 1
  return n
}
