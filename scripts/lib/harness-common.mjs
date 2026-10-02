/**
 * @wenaixi/dsh-superpower — 共享同名优先级实测框架与高阶 Harness
 *
 * 封装：
 * 1. 真实 Cordis + SkillRegistry 测试上下文 (freshRegistry)
 * 2. 结构化断言与失败统计 (check)
 * 3. 结果汇总与退出码决策 (exitByFailed)
 * 4. 高阶同名优先级裁决断言 (assertPriorityArbitration)
 */

import { Context } from '@deepseek-ai/cordis'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'

/**
 * 断言一条测试：actual 与 expected 相等为 PASS，否则 FAIL 并计入 state.failed。
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
 */
export function exitByFailed(title, state) {
  const n = state.failed
  console.log(n === 0 ? `\n${title}：全部通过\n` : `\n${title}：${n} 项失败\n`)
  process.exitCode = n === 0 ? 0 : 1
  if (n !== 0) process.exit(1)
  return n
}

/**
 * 高阶同名优先级裁决断言 Harness：
 * 自动编排正序注册、反序注册、同名胜出裁决、未受影响技能独立性与总数校验。
 */
export async function assertPriorityArbitration({
  state,
  suiteTitle,
  registerTargetFirst,
  registerRivalFirst,
  overriddenSkill = 'brainstorming',
  untouchedSkill = 'test-driven-development',
  expectedWinnerProvider = 'superpowers',
  expectedUntouchedProvider = 'superpowers',
  totalExpectedSkills = 15,
}) {
  // 1. 正序注册断言（target 先，rival 后）
  {
    const ctx = await freshRegistry()
    await registerTargetFirst(ctx)
    const candidates = await ctx.skills.list()
    const def = await ctx.skills.get(overriddenSkill)
    check(
      state,
      `[${suiteTitle}] 正序注册: 同名 ${overriddenSkill} 归 ${expectedWinnerProvider}`,
      def?.provider,
      expectedWinnerProvider
    )
    const untouched = await ctx.skills.get(untouchedSkill)
    check(
      state,
      `[${suiteTitle}] 正序注册: 未受影响技能 ${untouchedSkill} 正常加载`,
      untouched?.provider,
      expectedUntouchedProvider
    )
    check(
      state,
      `[${suiteTitle}] 正序注册: 技能总数 >= ${totalExpectedSkills}`,
      candidates.length >= totalExpectedSkills,
      true
    )
  }

  // 2. 反序注册断言（rival 先，target 后：验证与注册顺序完全无关，纯靠 rank 裁决）
  {
    const ctx = await freshRegistry()
    await registerRivalFirst(ctx)
    const def = await ctx.skills.get(overriddenSkill)
    check(
      state,
      `[${suiteTitle}] 反序注册: 同名 ${overriddenSkill} 仍归 ${expectedWinnerProvider}`,
      def?.provider,
      expectedWinnerProvider
    )
  }
}
