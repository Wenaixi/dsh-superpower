import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * hostLanguage() 在 settings 服务缺失/异常时的行为契约。
 *
 * 该函数靠 ctx.get('settings') 的可选读取工作（cordis get 对缺失服务返回
 * undefined 而非抛错），因此：settings 缺失时必须回退 undefined 而不是崩；
 * describe() 自身抛错时也必须回退，不能把异常泄漏到 skill list 调用链。
 */
test('settings 缺失时回退 undefined 且不抛错', async () => {
  const { hostLanguageFrom } = await import('../lib/superpowers.js')
  const ctx = { get: () => undefined }
  assert.equal(hostLanguageFrom(ctx), undefined)
})

test('describe() 抛错时回退 undefined 且不抛错', async () => {
  const { hostLanguageFrom } = await import('../lib/superpowers.js')
  const ctx = {
    get: () => ({ describe: () => { throw new Error('settings backend broken') } }),
  }
  assert.equal(hostLanguageFrom(ctx), undefined)
})

test('locale 条目 preference 为 en 时返回 en', async () => {
  const { hostLanguageFrom } = await import('../lib/superpowers.js')
  const ctx = {
    get: () => ({ describe: () => [{ ns: 'locale', value: { preference: 'en' } }] }),
  }
  assert.equal(hostLanguageFrom(ctx), 'en')
})

test('locale 条目 preference 为 zh 时返回 zh', async () => {
  const { hostLanguageFrom } = await import('../lib/superpowers.js')
  const ctx = {
    get: () => ({ describe: () => [{ ns: 'locale', value: { preference: 'zh' } }] }),
  }
  assert.equal(hostLanguageFrom(ctx), 'zh')
})

test('preference 缺省或非法时回退 undefined', async () => {
  const { hostLanguageFrom } = await import('../lib/superpowers.js')
  const ctx = {
    get: () => ({ describe: () => [{ ns: 'locale', value: {} }] }),
  }
  assert.equal(hostLanguageFrom(ctx), undefined)
})
