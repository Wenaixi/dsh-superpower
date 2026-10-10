/**
 * @wenaixi/dsh-superpower — 配置稳定性、容灾提取与自动重生专项测试套件
 *
 * 验证目标：
 * 就算配置严重损坏（非对象、字符串布尔、非标语言码、原型污染、脏键、旧表残留），
 * 插件也能安全从中抢救提取有效用户意图，宿主加载 0 崩溃，并能自动重新生成干净配置。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { freshRegistry } from './lib/harness-common.mjs'
import superpowersPlugin, {
  extractCleanDisabled,
  extractCleanLanguage,
  extractCleanSwitches,
  isConfigCorrupted,
  readSwitches,
} from '../lib/superpowers.js'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { resolve } from 'node:path'

/**
 * 纯内存加载客户端 SwitchPanelModel
 */
async function loadClientModel() {
  let bundleSpec = null
  const mockWindow = {
    __ModuleLoader__: {
      load: (spec) => { bundleSpec = spec },
    },
  }
  const code = await readFile(resolve('src/client.js'), 'utf8')
  vm.runInNewContext(code, { window: mockWindow, console })
  const mockRequire = (id) => {
    if (id === 'react') return { createElement: () => ({}), useState: (v) => [v, () => {}] }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return {}
    return {}
  }
  const exports = bundleSpec.factory(mockRequire)
  return exports.SwitchPanelModel
}

function createMockConfigForm(initialValue = {}, options = {}) {
  let value = structuredClone(initialValue)
  let status = options.status ?? 'ready'
  let writable = options.writable ?? true
  let disposed = options.disposed ?? false
  const listeners = new Set()
  const historyOps = []

  return {
    get disposed() { return disposed },
    getSnapshot: () => ({ status, writable, value: structuredClone(value) }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    mutate: async (ops) => {
      if (disposed || !writable) return false
      historyOps.push(structuredClone(ops))
      for (const op of ops) {
        if (op.op === 'set') {
          const [field, sub] = op.path
          if (sub) {
            value[field] = value[field] || {}
            value[field][sub] = op.value
          } else {
            value[field] = op.value
          }
        } else if (op.op === 'unset') {
          const [field, sub] = op.path
          if (sub) {
            if (value[field]) delete value[field][sub]
          } else {
            delete value[field]
          }
        }
      }
      listeners.forEach((fn) => fn())
      return true
    },
    __historyOps: historyOps,
  }
}

test('TC-R01: 非对象与极端类型输入容灾', () => {
  const inputs = [null, undefined, 'corrupted-string', [1, 2, 3], 12345, true]
  for (const input of inputs) {
    const res = extractCleanSwitches(input)
    assert.deepEqual(res.disabled, {}, '非对象输入必须安全回退为空字典')
    assert.equal(res.language, undefined, '非对象输入语言必须安全回退为 undefined')
  }
})

test('TC-R02: 字典值脏类型提取与假值过滤', () => {
  const dirty = {
    'brainstorming': 'true',
    'writing-plans': 1,
    'executing-plans': 'yes',
    'systematic-debugging': 'on',
    'test-driven-development': 'disabled',
    'using-superpowers': false,
    'using-git-worktrees': 'false',
    'receiving-code-review': 0,
    'requesting-code-review': 'no',
    'subagent-driven-development': 'off',
    'finishing-a-development-branch': null,
  }
  const clean = extractCleanDisabled(dirty)
  assert.equal(clean['brainstorming'], true, '必须从 "true" 提取 true')
  assert.equal(clean['writing-plans'], true, '必须从 1 提取 true')
  assert.equal(clean['executing-plans'], true, '必须从 "yes" 提取 true')
  assert.equal(clean['systematic-debugging'], true, '必须从 "on" 提取 true')
  assert.equal(clean['test-driven-development'], true, '必须从 "disabled" 提取 true')

  // 假值不得被提取为 true
  assert.equal(clean['using-superpowers'], undefined)
  assert.equal(clean['using-git-worktrees'], undefined)
  assert.equal(clean['receiving-code-review'], undefined)
  assert.equal(clean['requesting-code-review'], undefined)
  assert.equal(clean['subagent-driven-development'], undefined)
  assert.equal(clean['finishing-a-development-branch'], undefined)
})

test('TC-R03: 脏键拦截与原型污染硬防御', () => {
  const dirty = JSON.parse(
    '{"__proto__": {"polluted": true}, "constructor": "bad", "unknown-random-skill": true, "brainstorming": true}'
  )
  const clean = extractCleanDisabled(dirty)
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'), false, '严防原型污染')
  assert.equal(clean['unknown-random-skill'], undefined, '非已知技能名直接丢弃')
  assert.equal(clean['constructor'], undefined, '保留键丢弃')
  assert.equal(clean['brainstorming'], true, '合法技能名完整保留')
})

test('TC-R04: 非标语言代码自愈归一化', () => {
  assert.equal(extractCleanLanguage('zh'), 'zh')
  assert.equal(extractCleanLanguage('zh-CN'), 'zh')
  assert.equal(extractCleanLanguage('zh_CN'), 'zh')
  assert.equal(extractCleanLanguage('zh-Hans'), 'zh')
  assert.equal(extractCleanLanguage('chinese'), 'zh')

  assert.equal(extractCleanLanguage('en'), 'en')
  assert.equal(extractCleanLanguage('en-US'), 'en')
  assert.equal(extractCleanLanguage('en_US'), 'en')
  assert.equal(extractCleanLanguage('english'), 'en')

  assert.equal(extractCleanLanguage('auto'), undefined)
  assert.equal(extractCleanLanguage('invalid-language'), undefined)
  assert.equal(extractCleanLanguage(123), undefined)
})

test('TC-R05: 新旧表碎片合并与容灾优先级', () => {
  // 1. 新表有合法项时，优先只取新表
  const configWithBoth = {
    disabled: { 'brainstorming': 'true' },
    modelDisabled: { 'systematic-debugging': true },
    userDisabled: { 'writing-plans': true },
  }
  const out1 = extractCleanSwitches(configWithBoth)
  assert.deepEqual(Object.keys(out1.disabled), ['brainstorming'])

  // 2. 新表损坏或为空时，容灾合并两张旧表有效项
  const configCorruptedNew = {
    disabled: 'corrupted-non-object',
    modelDisabled: { 'systematic-debugging': 'true' },
    userDisabled: { 'writing-plans': 1, 'bad-skill': true },
  }
  const out2 = extractCleanSwitches(configCorruptedNew)
  assert.deepEqual(Object.keys(out2.disabled).sort(), ['systematic-debugging', 'writing-plans'])
})

test('TC-R06: 自愈幂等性严格断言', () => {
  const corruptInput = {
    disabled: { 'brainstorming': 'true', 'other': false },
    language: 'zh-CN',
  }
  const first = extractCleanSwitches(corruptInput)
  const second = extractCleanSwitches(first)
  assert.deepEqual(second, first, '自愈提取必须满足严格幂等性')
})

test('TC-R07: 客户端 SwitchPanelModel 损坏感知与自动重生派发', async () => {
  const SwitchPanelModel = await loadClientModel()
  const corruptForm = createMockConfigForm({
    disabled: { 'brainstorming': 'true', 'unknown-skill': true },
    language: 'zh-CN',
    modelDisabled: { 'old': true },
  })
  const model = new SwitchPanelModel(corruptForm)

  const snap = model.getSnapshot()
  assert.equal(snap.corrupted, true, '必须精准感知到配置存在损坏')
  assert.equal(snap.disabled['brainstorming'], true, '必须成功抢救提取有效禁用项')
  assert.equal(snap.language, 'zh', '必须自愈归一化语言为 zh')

  // 验证自动重生生成的修复 operations
  const repairOps = model.buildRepairOps()
  assert.ok(repairOps.length > 0, '必须生成规范化修复 operations')

  // 断言修复 ops 中包含对合法项的规范 set，对旧字段的 unset
  const setBrain = repairOps.find((o) => o.op === 'set' && o.path[1] === 'brainstorming')
  assert.ok(setBrain, '必须包含对 brainstorming 的规范化 set')
  const unsetUnknown = repairOps.find((o) => o.op === 'unset' && o.path[1] === 'unknown-skill')
  assert.ok(unsetUnknown, '必须包含对未知脏键的 unset')
  const unsetOldModel = repairOps.find((o) => o.op === 'unset' && o.path[0] === 'modelDisabled')
  assert.ok(unsetOldModel, '必须彻底 unset 废弃旧表')

  // 触发自动重生，将规范结构持久化回写
  const ok = await model.repairConfig()
  assert.equal(ok, true, '自愈回写必须成功执行')
  assert.equal(corruptForm.__historyOps.length, 1, '必须发起单次原子批处理回写')

  // 回写后再次取快照，断言损坏状态已彻底消除并规范化
  const healedSnap = model.getSnapshot()
  assert.equal(healedSnap.corrupted, false, '自愈后配置不再处于损坏状态')
  assert.equal(healedSnap.disabled['brainstorming'], true, '自愈后有效禁用项依然保持')

  model.dispose()
})

test('TC-R08: Cordis 真实宿主 Loader 防崩断言', async () => {
  const ctx = await freshRegistry()
  // 注入严重损坏的配置：disabled 为字符串，language 为非法类型，注入废弃字段
  const corruptConfig = {
    disabled: 'corrupted-string-that-previously-crashed-cordis',
    language: 'zh-CN',
    modelDisabled: { 'brainstorming': 'true' },
    userDisabled: [1, 2, 3],
  }

  // 必须 100% 成功加载插件，绝不抛出 invalid config 异常
  let loaded = false
  try {
    await ctx.plugin(superpowersPlugin, corruptConfig)
    loaded = true
  } catch (err) {
    loaded = false
    assert.fail('插件在损坏配置下加载崩溃: ' + err.message)
  }
  assert.equal(loaded, true, '插件必须在严重损坏配置下零崩溃正常激活')

  // 验证注册表功能依然完全正常，15 个技能完好无损
  const candidates = await ctx.skills.list()
  assert.equal(candidates.length, 15, '技能提供者必须正常提供 15 个技能')

  // 验证从旧表和脏语言中成功自愈提取出 brainstorming 禁用与中文描述
  const brain = candidates.find((c) => c.name === 'brainstorming')
  assert.equal(brain.invocation.modelInvocable, false, '自愈提取后 brainstorming 必须正确处于禁用态')
  assert.ok(brain.description.startsWith('Superpower Skill：'), '自愈提取后语言必须正确归一化为中文')
})
