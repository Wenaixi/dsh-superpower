/**
 * @wenaixi/dsh-superpower — SwitchPanelModel 客户端控制器状态机纯 Node 单测
 *
 * 依托 Node 原生 node:test + node:assert/strict，通过 node:vm 纯内存沙箱提取控制器，
 * 零 DOM 依赖、零浏览器进程，50ms 内完成全量状态机边界契约覆盖。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { resolve } from 'node:path'

/**
 * 通过 node:vm 内存沙箱隔离提取 client.js 内部导出的 SwitchPanelModel
 */
async function loadClientModel(clientJsPath = 'src/client.js') {
  let bundleSpec = null
  const mockWindow = {
    __ModuleLoader__: {
      load: (spec) => { bundleSpec = spec },
    },
  }

  const code = await readFile(resolve(clientJsPath), 'utf8')
  vm.runInNewContext(code, {
    window: mockWindow,
    console,
  })

  if (!bundleSpec || typeof bundleSpec.factory !== 'function') {
    throw new Error('未能在 client.js 中捕获有效的 ModuleLoader 工厂')
  }

  const mockRequire = (id) => {
    if (id === 'react') return { createElement: () => ({}), useState: (v) => [v, () => {}] }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return {}
    return {}
  }

  const exports = bundleSpec.factory(mockRequire)
  return {
    SwitchPanelModel: exports.SwitchPanelModel,
    allNames: [
      'brainstorming', 'diagnosing-superpowers', 'dispatching-parallel-agents',
      'executing-plans', 'finishing-a-development-branch', 'receiving-code-review',
      'requesting-code-review', 'subagent-driven-development', 'systematic-debugging',
      'test-driven-development', 'using-git-worktrees', 'using-superpowers',
      'verification-before-completion', 'writing-plans', 'writing-skills'
    ],
  }
}

/**
 * 最小 MockScope (ConfigForm 桩)
 */
function createMockConfigForm(initialValue = {}, options = {}) {
  let value = structuredClone(initialValue)
  let status = options.status ?? 'ready'
  let writable = options.writable ?? true
  let disposed = options.disposed ?? false
  const listeners = new Set()
  const historyOps = []

  return {
    get disposed() { return disposed },
    getSnapshot: () => ({
      status,
      writable,
      value: structuredClone(value),
    }),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    mutate: async (ops) => {
      if (disposed) return false
      if (!writable) return false
      if (options.shouldReject) {
        throw new Error(options.rejectReason || 'EIO: write failed')
      }
      if (options.rejectAccept) return false

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
    __setDisposed: (d) => { disposed = d },
  }
}

test('TC-01: 初始快照与状态映射', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({})
  const model = new SwitchPanelModel(form, { allNames })

  const snap = model.getSnapshot()
  assert.equal(snap.status, 'ready')
  assert.equal(snap.writable, true)
  assert.equal(snap.langValue, 'auto')
  assert.equal(snap.langConfigured, false)
  assert.equal(snap.language, undefined)
  assert.equal(snap.legacyActive, true)
  assert.deepEqual(Object.keys(snap.disabled), [])
  assert.deepEqual(Object.keys(snap.pending), [])
  assert.deepEqual(Object.keys(snap.failures), [])
  model.dispose()
})

test('TC-02: 单开关禁用与原子三段式 ops 构造', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({})
  const model = new SwitchPanelModel(form, { allNames })

  const ok = await model.toggle('brainstorming', false)
  assert.equal(ok, true)

  assert.equal(form.__historyOps.length, 1)
  const ops = form.__historyOps[0]
  assert.equal(ops.length, 3) // 1 set + 2 legacy unsets
  assert.deepEqual(ops[0], { op: 'set', path: ['disabled', 'brainstorming'], value: true })
  assert.deepEqual(ops[1], { op: 'unset', path: ['modelDisabled'] })
  assert.deepEqual(ops[2], { op: 'unset', path: ['userDisabled'] })

  const snap = model.getSnapshot()
  assert.equal(snap.disabled['brainstorming'], true)
  model.dispose()
})

test('TC-03: 单开关启用与 unset 契约', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({ disabled: { brainstorming: true } })
  const model = new SwitchPanelModel(form, { allNames })

  const ok = await model.toggle('brainstorming', true)
  assert.equal(ok, true)

  const ops = form.__historyOps[0]
  assert.deepEqual(ops[0], { op: 'unset', path: ['disabled', 'brainstorming'] })
  const snap = model.getSnapshot()
  assert.equal(snap.disabled['brainstorming'], undefined)
  model.dispose()
})

test('TC-04: 旧表回退态下的原子继承 (legacyCarry)', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  // 模拟旧版本升级：disabled 为空，modelDisabled 存在 writing-plans
  const form = createMockConfigForm({ modelDisabled: { 'writing-plans': true } })
  const model = new SwitchPanelModel(form, { allNames })

  assert.equal(model.getSnapshot().legacyActive, true)
  assert.equal(model.getSnapshot().disabled['writing-plans'], true)

  // 用户关闭 brainstorming，断言 writing-plans 必须原子继承写入 disabled
  await model.toggle('brainstorming', false)

  const ops = form.__historyOps[0]
  const carryOp = ops.find(o => o.path[0] === 'disabled' && o.path[1] === 'writing-plans')
  assert.ok(carryOp, '必须生成 writing-plans 的继承 set 操作')
  assert.equal(carryOp.op, 'set')
  assert.equal(carryOp.value, true)

  const newOp = ops.find(o => o.path[0] === 'disabled' && o.path[1] === 'brainstorming')
  assert.ok(newOp, '必须生成当前关闭项的操作')

  const snap = model.getSnapshot()
  assert.equal(snap.disabled['writing-plans'], true)
  assert.equal(snap.disabled['brainstorming'], true)
  model.dispose()
})

test('TC-05: 批量操作原子批处理 (allOps 拍平，非 15 次并发)', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({})
  const model = new SwitchPanelModel(form, { allNames })

  // 全部关闭
  await model.disableAll()
  assert.equal(form.__historyOps.length, 1, '必须仅发起 1 次原子 mutate 调用')
  const ops = form.__historyOps[0]
  assert.equal(ops.length, 17, '必须是 15 个 set + 2 个 legacy unsets')

  // 全部开启
  await model.enableAll()
  assert.equal(form.__historyOps.length, 2)
  const enableOps = form.__historyOps[1]
  assert.equal(enableOps.length, 17, '必须是 15 个 unset + 2 个 legacy unsets')
  model.dispose()
})

test('TC-06: resetAll 仅重置禁言表，保持语言偏好绝对正交', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({ language: 'en', disabled: { brainstorming: true } })
  const model = new SwitchPanelModel(form, { allNames })

  assert.equal(model.getSnapshot().language, 'en')

  await model.resetAll()
  const ops = form.__historyOps[0]
  // 断言所有的 ops 路径均不包含 language
  const hasLangOp = ops.some(o => o.path[0] === 'language')
  assert.equal(hasLangOp, false, 'resetAll 绝不能操作 language 字段')

  const snap = model.getSnapshot()
  assert.equal(snap.language, 'en', '重置开关后语言偏好依然保持英文')
  assert.deepEqual(Object.keys(snap.disabled), [], '禁言表已完全清空')
  model.dispose()
})

test('TC-07: 语言偏好三态控制与 unset 语义', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({})
  const model = new SwitchPanelModel(form, { allNames })

  // 1. 显式设为 en
  await model.setLanguage('en')
  assert.deepEqual(form.__historyOps[0], [{ op: 'set', path: ['language'], value: 'en' }])
  assert.equal(model.getSnapshot().language, 'en')
  assert.equal(model.getSnapshot().langValue, 'en')

  // 2. 切回 auto，断言必须派发 unset 彻底删除字段
  await model.setLanguage('auto')
  assert.deepEqual(form.__historyOps[1], [{ op: 'unset', path: ['language'] }])
  assert.equal(model.getSnapshot().language, undefined)
  assert.equal(model.getSnapshot().langValue, 'auto')
  model.dispose()
})

test('TC-08: 错误捕获、disposed 拦截与堆栈输出', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({}, { shouldReject: true, rejectReason: 'EACCES: permission denied' })
  const model = new SwitchPanelModel(form, { allNames, t: (k) => k })

  // 劫持 console.error 验证防静默失败契约
  let loggedError = null
  const originalError = console.error
  console.error = (...args) => {
    loggedError = args.join(' ')
  }

  try {
    const ok = await model.toggle('brainstorming', false)
    assert.equal(ok, false)
    assert.ok(loggedError && loggedError.includes('[dsh-superpower] form.mutate failed:'))
    assert.ok(loggedError.includes('EACCES'))

    const snap = model.getSnapshot()
    assert.ok(snap.failures['brainstorming'])
  } finally {
    console.error = originalError
    model.dispose()
  }

  // 测试 disposed 前置拦截
  const disposedForm = createMockConfigForm({}, { disposed: true })
  const disposedModel = new SwitchPanelModel(disposedForm, { allNames })
  const res = await disposedModel.enableAll()
  assert.equal(res, false)
  disposedModel.dispose()
})

test('TC-09: 搜索状态机流转与多语言可见条目派生', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({})
  const model = new SwitchPanelModel(form, { allNames })

  // 1. 初始状态
  assert.equal(model.getSnapshot().keyword, '', '初始搜索关键字应为空')
  const initialSkills = model.getVisibleSkills('zh')
  assert.equal(initialSkills.length, 15, '初始应展示全量 15 个技能')
  assert.equal(initialSkills[0].displayText, initialSkills[0].description, '默认中文环境下展示中文描述')

  // 2. 响应式订阅通知
  let notified = false
  const unsubscribe = model.subscribe(() => { notified = true })
  model.setKeyword('brain')
  assert.equal(notified, true, 'setKeyword 必须触发订阅通知')
  assert.equal(model.getSnapshot().keyword, 'brain')
  unsubscribe()

  // 3. 中文关键词检索
  model.setKeyword('创意')
  const zhResults = model.getVisibleSkills('zh')
  assert.equal(zhResults.length, 1)
  assert.equal(zhResults[0].name, 'brainstorming')
  assert.ok(zhResults[0].displayText.includes('创意工作前必用'))

  // 4. 英文关键词大小写不敏感检索 + 宿主英文环境
  model.setKeyword('BRAIN')
  const enResults = model.getVisibleSkills('en')
  assert.equal(enResults.length, 1)
  assert.equal(enResults[0].name, 'brainstorming')
  assert.ok(enResults[0].displayText.includes('creative work'), '英文环境下展示英文描述')

  // 5. 无匹配项返回空列表
  model.setKeyword('nonexistent-keyword-404')
  assert.equal(model.getVisibleSkills('zh').length, 0, '无匹配结果时应返回空列表')

  // 6. 清空搜索恢复全量
  model.setKeyword('')
  assert.equal(model.getVisibleSkills('zh').length, 15, '清空搜索后恢复全量 15 个技能')

  model.dispose()
})
test('TC-10: getSnapshot 引用稳定性与 React useSyncExternalStore 缓存契约 (防界面卡死崩溃)', async () => {
  const { SwitchPanelModel, allNames } = await loadClientModel()
  const form = createMockConfigForm({ disabled: { brainstorming: true } })
  const model = new SwitchPanelModel(form, { allNames })

  // 1. 核心断言：连续两次读取快照必须引用恒等，防止 React 18 useSyncExternalStore 无限重渲染死循环
  const snap1 = model.getSnapshot()
  const snap2 = model.getSnapshot()
  assert.equal(snap1, snap2, '未发生任何配置变更时，getSnapshot 返回的引用必须严格恒等')
  assert.equal(snap1.disabled, snap2.disabled, '内部嵌套的 disabled 字典引用也必须保持稳定')

  // 2. 核心断言：updateScope 传入相同 scope 时绝不能触发 _notify 广播
  let notified = false
  const off = model.subscribe(() => { notified = true })
  model.updateScope(form)
  assert.equal(notified, false, 'updateScope 传入相同 form 时绝不能触发订阅广播，防止 render 期无限循环')
  off()

  // 3. 核心断言：当真正发生数据变动时，快照必须更新为新引用
  await model.toggle('brainstorming', true)
  const snap3 = model.getSnapshot()
  assert.notEqual(snap1, snap3, '数据发生真实变更后，快照必须更新为新引用')
  assert.equal(snap3.disabled['brainstorming'], undefined)

  model.dispose()
})
