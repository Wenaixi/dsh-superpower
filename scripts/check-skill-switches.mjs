/**
 * @wenaixi/dsh-superpower — 技能开关端到端实测
 *
 * 在真实的 SkillRegistry 上验证四件事：
 * 1. 默认配置下 15 个技能全部可见；
 * 2. 禁言表把对应技能的 modelInvocable 与 userInvocable 同时翻为 false，且只影响它自己；
 * 3. v7.3.0 遗留的两张分侧禁言表在 disabled 为空时并集生效；
 * 4. 运行中改开关后，派发 loader/volatile-update 能让注册表丢弃缓存并在下一轮读到新目录。
 *
 * 用真实 Cordis 上下文与真实 SkillRegistry（复用 harness-common 的 freshRegistry），
 * 不自造桩：注册表的缓存行为正是第 4 段要钉住的东西，桩替身测不到。
 */

import { resolveConfig } from '@deepseek-ai/cordis'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'
import { check, freshRegistry, exitByFailed } from './lib/harness-common.mjs'
import superpowers, { EXPECTED_SKILL_COUNT } from '../lib/superpowers.js'

const state = { failed: 0 }
console.log('[check-switches] 开始技能开关端到端实测...')

/**
 * 装载本插件并返回解析后的配置。
 *
 * 传给 ctx.plugin 的必须是原始配置（普通对象）：schemastery 先按 schema 校验，
 * 才把标记了 volatile() 的字段包装成引用；直接塞引用会被当成 dict 去校验，
 * 报「expected boolean but got function」。插件 apply 收到的是解析后的形状，
 * 禁言字段在那里是带 get() 的 volatile 引用。
 *
 * resolved 用 ctx.registry.stash 取回同一份解析结果，供场景 4 就地换值，
 * 避免为了拿引用而改动被测代码。
 *
 * @param {object} raw - 原始配置；只传需要的字段，其余取 schema 默认
 * @returns {Promise<{ ctx: object, resolved: object }>}
 */
async function loadPlugin(raw) {
  const ctx = await freshRegistry()
  const config = resolveConfig(
    { name: superpowers.name, inject: superpowers.inject, Config: superpowers.Config, apply: superpowers.apply },
    { providerName: 'superpowers', ...raw },
  )
  // 以对象插件形式装载本包 apply，注入已解析的配置；
  // 这样测试持有同一份引用，能在场景 4 里就地换值而不必改动被测代码。
  await ctx.plugin({ name: superpowers.name, inject: superpowers.inject, apply: superpowers.apply }, config)
  return { ctx, resolved: config }
}

// ---------------------------------------------------------------------------
// 场景 1：默认全开
// ---------------------------------------------------------------------------
{
  const { ctx } = await loadPlugin({})
  const snapshot = await ctx.skills.snapshot()
  check(state, '[默认全开] 技能总数', snapshot.skills.length, EXPECTED_SKILL_COUNT)
  check(
    state,
    '[默认全开] 全部模型可调用',
    snapshot.skills.every((skill) => skill.invocation.modelInvocable),
    true,
  )
  check(
    state,
    '[默认全开] 全部用户可调用',
    snapshot.skills.every((skill) => skill.invocation.userInvocable),
    true,
  )
  const loaded = await ctx.skills.get('brainstorming')
  check(state, '[默认全开] get() 返回的策略仍全开', loaded?.invocation.modelInvocable, true)
}

// ---------------------------------------------------------------------------
// 场景 2：新表禁言生效，两侧同时关闭且不误伤他人
// ---------------------------------------------------------------------------
{
  const { ctx } = await loadPlugin({ disabled: { brainstorming: true, 'writing-plans': true } })
  const snapshot = await ctx.skills.snapshot()
  const byName = new Map(snapshot.skills.map((skill) => [skill.name, skill]))

  check(state, '[禁言生效] brainstorming 两侧同时关闭', byName.get('brainstorming')?.invocation.modelInvocable === false && byName.get('brainstorming')?.invocation.userInvocable === false, true)
  check(state, '[禁言生效] writing-plans 两侧同时关闭', byName.get('writing-plans')?.invocation.modelInvocable === false && byName.get('writing-plans')?.invocation.userInvocable === false, true)

  const others = snapshot.skills.filter((skill) => skill.name !== 'brainstorming' && skill.name !== 'writing-plans')
  check(
    state,
    '[禁言生效] 其余 13 个技能完全不受影响',
    others.every((skill) => skill.invocation.modelInvocable && skill.invocation.userInvocable),
    true,
  )

  // 技能仍占注册表名额，只是不再对任何一侧可见
  check(state, '[禁言生效] 关闭的技能仍保留在注册表清单中', snapshot.skills.length, EXPECTED_SKILL_COUNT)

  // get() 路径同样套用，否则模型目录消失但 skill 工具调用仍会成功
  const loaded = await ctx.skills.get('brainstorming')
  check(
    state,
    '[禁言生效] get() 返回的策略与 list() 一致',
    loaded?.invocation.modelInvocable === false && loaded?.invocation.userInvocable === false,
    true,
  )
}

// ---------------------------------------------------------------------------
// 场景 3：v7.3.0 的两张分侧禁言表在升级后并集生效
// ---------------------------------------------------------------------------
{
  const { ctx } = await loadPlugin({ modelDisabled: { brainstorming: true }, userDisabled: { 'writing-plans': true } })
  const snapshot = await ctx.skills.snapshot()
  const byName = new Map(snapshot.skills.map((skill) => [skill.name, skill]))

  check(
    state,
    '[旧表并集] 旧模型侧表中的 brainstorming 两侧均关闭',
    byName.get('brainstorming')?.invocation.modelInvocable === false &&
      byName.get('brainstorming')?.invocation.userInvocable === false,
    true,
  )
  check(
    state,
    '[旧表并集] 旧用户侧表中的 writing-plans 两侧均关闭',
    byName.get('writing-plans')?.invocation.modelInvocable === false &&
      byName.get('writing-plans')?.invocation.userInvocable === false,
    true,
  )
  const others = snapshot.skills.filter((skill) => skill.name !== 'brainstorming' && skill.name !== 'writing-plans')
  check(
    state,
    '[旧表并集] 其余技能不受旧表牵连',
    others.every((skill) => skill.invocation.modelInvocable && skill.invocation.userInvocable),
    true,
  )
}

// ---------------------------------------------------------------------------
// 场景 4：新表非空时旧表失效（用户已在面板操作过，旧值即过期）
// ---------------------------------------------------------------------------
{
  const { ctx } = await loadPlugin({
    disabled: { brainstorming: true },
    modelDisabled: { brainstorming: true, 'writing-plans': true },
  })
  const snapshot = await ctx.skills.snapshot()
  const byName = new Map(snapshot.skills.map((skill) => [skill.name, skill]))
  check(
    state,
    '[新表优先] disabled 中的 brainstorming 两侧关闭',
    byName.get('brainstorming')?.invocation.modelInvocable === false &&
      byName.get('brainstorming')?.invocation.userInvocable === false,
    true,
  )
  check(
    state,
    '[新表优先] 仅存在于旧表的 writing-plans 回到开启',
    byName.get('writing-plans')?.invocation.modelInvocable === true &&
      byName.get('writing-plans')?.invocation.userInvocable === true,
    true,
  )
}

// ---------------------------------------------------------------------------
// 场景 5：运行中改开关 + 派发 volatile 事件后，目录立刻刷新
// ---------------------------------------------------------------------------
{
  const { ctx, resolved: config } = await loadPlugin({})

  const before = await ctx.skills.snapshot()
  check(
    state,
    '[热失效] 改前 writing-plans 模型侧可见',
    before.skills.find((skill) => skill.name === 'writing-plans')?.invocation.modelInvocable,
    true,
  )

  updateVolatile(config.disabled, createVolatile({ 'writing-plans': true }))
  // 真实事件名与真实 emit；插件侧的监听挂在 loader/volatile-update 上
  await ctx.emit('loader/volatile-update', [['disabled']])

  const after = await ctx.skills.snapshot()
  check(
    state,
    '[热失效] 改后 writing-plans 两侧关闭',
    after.skills.find((skill) => skill.name === 'writing-plans')?.invocation.modelInvocable === false &&
      after.skills.find((skill) => skill.name === 'writing-plans')?.invocation.userInvocable === false,
    true,
  )
  check(
    state,
    '[热失效] 改后技能总数不变',
    after.skills.length,
    EXPECTED_SKILL_COUNT,
  )
}

// ---------------------------------------------------------------------------
// 场景 6：语言偏好（language）驱动模型侧正文与描述，且不触碰开关 invocation
// ---------------------------------------------------------------------------
{
  const { ctx: zhCtx } = await loadPlugin({})
  const zhSkill = await zhCtx.skills.get('brainstorming')
  check(
    state,
    '[语言偏好] 默认：描述为中文前缀',
    typeof zhSkill?.description === 'string' && zhSkill.description.startsWith('Superpower Skill：'),
    true,
  )
  check(
    state,
    '[语言偏好] 默认：正文恒为英文（SKILL.md 正文）',
    !/[\u4e00-\u9fff]/.test(zhSkill?.content ?? ''),
    true,
  )

  const { ctx: enCtx } = await loadPlugin({ language: 'en' })
  const enSkill = await enCtx.skills.get('brainstorming')
  check(
    state,
    '[语言偏好] language=en：描述切为英文前缀',
    typeof enSkill?.description === 'string' && enSkill.description.startsWith('Superpower Skill: '),
    true,
  )
  check(
    state,
    '[语言偏好] language=en：正文仍为英文',
    !/[\u4e00-\u9fff]/.test(enSkill?.content ?? ''),
    true,
  )
  check(
    state,
    '[语言偏好] 开关 invocation 不受影响',
    enSkill?.invocation.modelInvocable === true && enSkill?.invocation.userInvocable === true,
    true,
  )
  const enSnapshot = await enCtx.skills.snapshot()
  check(state, '[语言偏好] language=en：技能总数不变', enSnapshot.skills.length, EXPECTED_SKILL_COUNT)
  check(
    state,
    '[语言偏好] language=en：目录描述全部为英文前缀',
    enSnapshot.skills.every((skill) => skill.description.startsWith('Superpower Skill: ')),
    true,
  )
}

exitByFailed('技能开关端到端实测', state)