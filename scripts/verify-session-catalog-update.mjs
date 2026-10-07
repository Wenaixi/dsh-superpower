/**
 * @wenaixi/dsh-superpower — 已存在会话技能描述与开关动态更新实证探针
 *
 * 按照 dsh-plugin-dev 规范，直接装配 DSH 官方 @deepseek-ai/dsh-tool-skill 源码与本插件，
 * 在真实的 Cordis + SkillRegistry 环境下模拟一个持有持久化历史的已存在会话（Existing Session），
 * 实机核实：
 * 1. 配置未变时：无任何 catalog update 消息注入；
 * 2. 语言切换时：100% 产生 update: true 的 renderCatalogUpdate 增量消息，且描述全量刷新；
 * 3. 开关切换时：100% 产生 update: true 的增量消息，关闭技能精准剔除；
 * 4. 全关极端时：触发官方预设的 'No skills are currently available' 降级提醒；
 * 5. 历史事件零改动验证：证明历史前缀未变，LLM Prompt Cache 得到保全。
 */

import { resolve } from 'node:path'
import { Context, resolveConfig } from '@deepseek-ai/cordis'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'
import { check, freshRegistry, exitByFailed } from './lib/harness-common.mjs'
import superpowers from '../lib/superpowers.js'

// 动态载入从 app.asar 解出的官方 dsh-tool-skill 原装模块
const toolSkillPath = resolve('.cache-repos/asar/dsh/node_modules/@deepseek-ai/dsh-tool-skill/lib/index.js')
const toolSkill = await import('file:///' + toolSkillPath.replace(/\\/g, '/'))

const state = { failed: 0 }
console.log('[verify-catalog-update] 开始深度实机核实：已存在会话更新机制与缓存保全...\n')

// 建立集成环境：装配 SkillRegistry、最小 tools/agents 支撑服务、dsh-tool-skill 与 dsh-superpower
async function setupIntegratedHarness(rawConfig = {}) {
  const ctx = await freshRegistry()

  // 1. 最小 tools 服务：支撑 dsh-tool-skill 注册并反查 skillTool
  let registeredTool
  ctx.provide('tools')
  ctx.tools = {
    register: (tool) => { registeredTool = tool },
    get: (name) => (name === 'skill' ? registeredTool : undefined)
  }

  // 2. 最小 agents 服务（满足 inject 契约）
  ctx.provide('agents')
  ctx.agents = {}

  // 3. 挂载官方 dsh-tool-skill
  await ctx.plugin(toolSkill)

  // 4. 挂载本插件
  const config = resolveConfig(
    { name: superpowers.name, inject: superpowers.inject, Config: superpowers.Config, apply: superpowers.apply },
    { providerName: 'superpowers', ...rawConfig }
  )
  await ctx.plugin({ name: superpowers.name, inject: superpowers.inject, apply: superpowers.apply }, config)

  return { ctx, config, skillTool: registeredTool }
}

// 模拟构造一个已存在会话的 Agent 实例
function createMockAgent(sessionHistoryEvents = []) {
  const events = [...sessionHistoryEvents]
  const session = {
    id: 'mock-existing-session-001',
    seq: events.length,
    header: { cwd: process.cwd() },
    surface: { nodes: events.map((_, i) => i) },
    eventAt: (seq) => events[seq]
  }
  return {
    id: 'mock-agent-main',
    session
  }
}

// ---------------------------------------------------------------------------
// 场景 1：会话已存在且配置未变 -> 零 catalog 消息追加
// ---------------------------------------------------------------------------
{
  console.log('--- 场景 1：会话已存在且配置未变 ---')
  const { ctx, config } = await setupIntegratedHarness({})
  
  // 先获取当前默认状态下的目录条目，用于充当该会话历史上的第一轮初始 catalog
  const snapshot = await ctx.skills.snapshot()
  const initialEntries = snapshot.skills.map((s) => ({
    name: s.name,
    description: s.description.replaceAll(/\s+/g, ' ').trim()
  }))

  const initialHistoryEvent = {
    type: 'user/message',
    seq: 0,
    data: {
      source: {
        kind: 'skill-catalog',
        form: 'catalog',
        entries: initialEntries
      }
    }
  }

  const agent = createMockAgent([initialHistoryEvent])
  const abortController = new AbortController()

  // 模拟该会话执行第二轮（新消息提问），触发 pre-step
  const stepDecision = await ctx.waterfall('agent/pre-step', {
    agent,
    signal: abortController.signal,
    messages: []
  }, () => Promise.resolve({ kind: 'enter', messages: [] }))

  check(state, '[配置未变] 决策消息列表无新增 catalog 消息', stepDecision.messages.length, 0)
}

// ---------------------------------------------------------------------------
// 场景 2：语言切换为英文 -> 100% 触发 update: true 且历史零改动
// ---------------------------------------------------------------------------
{
  console.log('\n--- 场景 2：语言切换为英文（language: en） ---')
  const { ctx, config } = await setupIntegratedHarness({})

  // 历史第一轮为中文目录
  const snapshotZh = await ctx.skills.snapshot()
  const zhEntries = snapshotZh.skills.map((s) => ({
    name: s.name,
    description: s.description.replaceAll(/\s+/g, ' ').trim()
  }))
  const historyEvent = {
    type: 'user/message',
    seq: 0,
    data: {
      source: {
        kind: 'skill-catalog',
        form: 'catalog',
        entries: zhEntries
      }
    }
  }
  const historyCopy = JSON.parse(JSON.stringify(historyEvent))
  const agent = createMockAgent([historyEvent])

  // 操作：热切换语言为 en 并派发 volatile 事件
  updateVolatile(config.language, createVolatile('en'))
  await ctx.emit('loader/volatile-update', [['language']])

  // 模拟该已有会话续聊触发 pre-step
  const abortController = new AbortController()
  const stepDecision = await ctx.waterfall('agent/pre-step', {
    agent,
    signal: abortController.signal,
    messages: []
  }, () => Promise.resolve({ kind: 'enter', messages: [] }))

  const updateMsg = stepDecision.messages.find((m) => m.source?.kind === 'skill-catalog')
  check(state, '[语言切换] 产生 catalog 消息', Boolean(updateMsg), true)
  check(state, '[语言切换] 标记 update: true', updateMsg?.source?.update, true)
  
  const textContent = updateMsg?.content?.[0]?.text || ''
  check(
    state,
    '[语言切换] 包含替换通知提示词',
    textContent.includes('The available skill catalog changed. This complete catalog replaces every earlier available-skills list in this session:'),
    true
  )
  check(
    state,
    '[语言切换] 所有条目描述均切为英文前缀 (Superpower Skill: )',
    updateMsg?.source?.entries?.every((e) => e.description.startsWith('Superpower Skill: ')),
    true
  )
  check(
    state,
    '[历史保全] 历史事件对象未被修改（一字未动）',
    JSON.stringify(historyEvent),
    JSON.stringify(historyCopy)
  )
}

// ---------------------------------------------------------------------------
// 场景 3：技能开关切换（禁用某个技能） -> 精准剔除并触发 update: true
// ---------------------------------------------------------------------------
{
  console.log('\n--- 场景 3：技能开关切换（禁用 brainstorming） ---')
  const { ctx, config } = await setupIntegratedHarness({})

  const snapshotInitial = await ctx.skills.snapshot()
  const initialEntries = snapshotInitial.skills.map((s) => ({
    name: s.name,
    description: s.description.replaceAll(/\s+/g, ' ').trim()
  }))
  const historyEvent = {
    type: 'user/message',
    seq: 0,
    data: {
      source: {
        kind: 'skill-catalog',
        form: 'catalog',
        entries: initialEntries
      }
    }
  }
  const agent = createMockAgent([historyEvent])

  // 操作：禁用 brainstorming 并派发事件
  updateVolatile(config.disabled, createVolatile({ brainstorming: true }))
  await ctx.emit('loader/volatile-update', [['disabled']])

  // 执行 pre-step
  const abortController = new AbortController()
  const stepDecision = await ctx.waterfall('agent/pre-step', {
    agent,
    signal: abortController.signal,
    messages: []
  }, () => Promise.resolve({ kind: 'enter', messages: [] }))

  const updateMsg = stepDecision.messages.find((m) => m.source?.kind === 'skill-catalog')
  check(state, '[开关切换] 标记 update: true', updateMsg?.source?.update, true)
  check(state, '[开关切换] 技能总数变为 14', updateMsg?.source?.entries?.length, 14)
  check(
    state,
    '[开关切换] brainstorming 从模型可见目录中剔除',
    updateMsg?.source?.entries?.some((e) => e.name === 'brainstorming'),
    false
  )
}

// ---------------------------------------------------------------------------
// 场景 4：极限情况（全部 15 个技能全部关闭） -> 触发专属安全降级通知
// ---------------------------------------------------------------------------
{
  console.log('\n--- 场景 4：极限情况（15 个技能全部关闭） ---')
  const { ctx, config } = await setupIntegratedHarness({})

  const snapshotInitial = await ctx.skills.snapshot()
  const initialEntries = snapshotInitial.skills.map((s) => ({
    name: s.name,
    description: s.description.replaceAll(/\s+/g, ' ').trim()
  }))
  const historyEvent = {
    type: 'user/message',
    seq: 0,
    data: {
      source: {
        kind: 'skill-catalog',
        form: 'catalog',
        entries: initialEntries
      }
    }
  }
  const agent = createMockAgent([historyEvent])

  // 把所有技能全关掉
  const allDisabled = Object.fromEntries(initialEntries.map((e) => [e.name, true]))
  updateVolatile(config.disabled, createVolatile(allDisabled))
  await ctx.emit('loader/volatile-update', [['disabled']])

  // 执行 pre-step
  const abortController = new AbortController()
  const stepDecision = await ctx.waterfall('agent/pre-step', {
    agent,
    signal: abortController.signal,
    messages: []
  }, () => Promise.resolve({ kind: 'enter', messages: [] }))

  const updateMsg = stepDecision.messages.find((m) => m.source?.kind === 'skill-catalog')
  check(state, '[全关降级] 依然产生 update 消息', Boolean(updateMsg), true)
  check(state, '[全关降级] 标记 update: true', updateMsg?.source?.update, true)
  check(state, '[全关降级] 条目总数为 0', updateMsg?.source?.entries?.length, 0)
  
  const textContent = updateMsg?.content?.[0]?.text || ''
  check(
    state,
    '[全关降级] 包含专属安全降级提示词',
    textContent.includes('No skills are currently available through the `skill` tool.'),
    true
  )
}

exitByFailed('已存在会话更新机制与缓存保全实机核实', state)
