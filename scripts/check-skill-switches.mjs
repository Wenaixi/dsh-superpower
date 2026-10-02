/**
 * @wenaixi/dsh-superpower — 技能开关端到端实测
 *
 * 在真实的 SkillRegistry 上验证三件事：
 * 1. 默认配置下 15 个技能两侧全部可见；
 * 2. 宿主侧配置里的禁言表确实把对应技能的 invocation 布尔翻为 false，且只影响它自己；
 * 3. 运行中改开关后，派发 loader/volatile-update 能让注册表丢弃缓存并在下一轮读到新目录。
 *
 * 用真实 Cordis 上下文与真实 SkillRegistry（复用 harness-common 的 freshRegistry），
 * 不自造桩：注册表的缓存行为正是第 3 段要钉住的东西，桩替身测不到。
 */

import { resolveConfig } from '@deepseek-ai/cordis'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'
import { check, freshRegistry, exitByFailed } from './lib/harness-common.mjs'
import superpowers from '../lib/superpowers.js'

const state = { failed: 0 }
console.log('[check-switches] 开始技能开关端到端实测...')

/**
 * 装载本插件并返回解析后的配置。
 *
 * 传给 ctx.plugin 的必须是原始配置（普通对象）：schemastery 先按 schema 校验，
 * 才把标记了 volatile() 的字段包装成引用；直接塞引用会被当成 dict 去校验，
 * 报「expected boolean but got function」。插件 apply 收到的是解析后的形状，
 * 两个禁言字段在那里是带 get() 的 volatile 引用。
 *
 * resolved 用 ctx.registry.stash 取回同一份解析结果，供场景 3 就地换值，
 * 避免为了拿引用而改动被测代码。
 */
async function loadPlugin(modelDisabled, userDisabled) {
  const ctx = await freshRegistry()
  const config = resolveConfig(
    { name: superpowers.name, inject: superpowers.inject, Config: superpowers.Config, apply: superpowers.apply },
    {
      providerName: 'superpowers',
      modelDisabled: modelDisabled ?? {},
      userDisabled: userDisabled ?? {},
    },
  )
  // 以对象插件形式装载本包 apply，注入已解析的配置；
  // 这样测试持有同一份引用，能在场景 3 里就地换值而不必改动被测代码。
  await ctx.plugin({ name: superpowers.name, inject: superpowers.inject, apply: superpowers.apply }, config)
  return { ctx, resolved: config }
}

// ---------------------------------------------------------------------------
// 场景 1：默认全开
// ---------------------------------------------------------------------------
{
  const { ctx } = await loadPlugin({}, {})
  const snapshot = await ctx.skills.snapshot()
  check(state, '[默认全开] 技能总数', snapshot.skills.length, 15)
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
// 场景 2：宿主侧禁言表生效，且只影响被点名的技能
// ---------------------------------------------------------------------------
{
  const { ctx } = await loadPlugin({ brainstorming: true }, { 'writing-plans': true })
  const snapshot = await ctx.skills.snapshot()
  const byName = new Map(snapshot.skills.map((skill) => [skill.name, skill]))

  check(state, '[禁言生效] brainstorming 模型侧关闭', byName.get('brainstorming')?.invocation.modelInvocable, false)
  check(state, '[禁言生效] brainstorming 用户侧不受影响', byName.get('brainstorming')?.invocation.userInvocable, true)
  check(state, '[禁言生效] writing-plans 用户侧关闭', byName.get('writing-plans')?.invocation.userInvocable, false)
  check(state, '[禁言生效] writing-plans 模型侧不受影响', byName.get('writing-plans')?.invocation.modelInvocable, true)

  const others = snapshot.skills.filter((skill) => skill.name !== 'brainstorming' && skill.name !== 'writing-plans')
  check(
    state,
    '[禁言生效] 其余 13 个技能完全不受影响',
    others.every((skill) => skill.invocation.modelInvocable && skill.invocation.userInvocable),
    true,
  )

  // 技能仍占注册表名额，只是不再对某一侧可见
  check(state, '[禁言生效] 关闭的技能仍保留在注册表清单中', snapshot.skills.length, 15)

  // get() 路径同样套用，否则模型目录消失但 skill 工具调用仍会成功
  const loaded = await ctx.skills.get('brainstorming')
  check(state, '[禁言生效] get() 返回的策略与 list() 一致', loaded?.invocation.modelInvocable, false)
}

// ---------------------------------------------------------------------------
// 场景 3：运行中改开关 + 派发 volatile 事件后，目录立刻刷新
// ---------------------------------------------------------------------------
{
  const { ctx, resolved: config } = await loadPlugin({}, {})

  const before = await ctx.skills.snapshot()
  check(
    state,
    '[热失效] 改前 writing-plans 模型侧可见',
    before.skills.find((skill) => skill.name === 'writing-plans')?.invocation.modelInvocable,
    true,
  )

  updateVolatile(config.modelDisabled, createVolatile({ 'writing-plans': true }))
  // 真实事件名与真实 emit；插件侧的监听挂在 loader/volatile-update 上
  await ctx.emit('loader/volatile-update', [['modelDisabled']])

  const after = await ctx.skills.snapshot()
  check(
    state,
    '[热失效] 改后 writing-plans 模型侧关闭',
    after.skills.find((skill) => skill.name === 'writing-plans')?.invocation.modelInvocable,
    false,
  )
  check(
    state,
    '[热失效] 改后技能总数不变',
    after.skills.length,
    15,
  )
}

exitByFailed('技能开关端到端实测', state)
