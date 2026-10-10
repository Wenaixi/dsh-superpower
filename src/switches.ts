/**
 * @wenaixi/dsh-superpower — 技能开关状态深度模块 (含容灾自愈提取引擎)
 *
 * 封装「哪个技能被关闭」的唯一判据：一张以技能名为键的禁言字典。
 *
 * 核心设计：
 * - Depth: 把 volatile 引用解包、Invocation 覆盖、容灾提取与脏数据自愈彻底封装在门后；
 * - Locality: 所有开关语义与配置容错自愈逻辑内聚于此，Provider 与客户端共用；
 * - Test Surface: selfTest() 是接口即测试表面，随 verifySpecification 一并进门禁。
 *
 * 容灾自愈保证：
 * 无论外部输入遭遇何种程度的破坏（非对象、字符串布尔值、脏区域码、原型污染、未知键残留），
 * 本模块均能安全从中抢救提取有效用户意图，绝不抛出异常崩溃。
 */

import type { SkillInvocationPolicy } from '@deepseek-ai/dsh-skill'

/** 本包所管理的 15 个标准技能名白名单集合。 */
export const KNOWN_SKILLS = new Set([
  'brainstorming',
  'diagnosing-superpowers',
  'dispatching-parallel-agents',
  'executing-plans',
  'finishing-a-development-branch',
  'receiving-code-review',
  'requesting-code-review',
  'subagent-driven-development',
  'systematic-debugging',
  'test-driven-development',
  'using-git-worktrees',
  'using-superpowers',
  'verification-before-completion',
  'writing-plans',
  'writing-skills',
])

/** 以技能名为键的禁言表：键存在且值为 true 表示该技能被关闭。 */
export interface SkillSwitches {
  /** 关闭的技能名集合，映射为 modelInvocable = userInvocable = false。 */
  disabled: Record<string, boolean>
  /** 技能描述显示语言偏好：'zh'/'en' 显式固定；undefined 表示跟随宿主界面语言。 */
  language: 'zh' | 'en' | undefined
}

/** 容灾提取结果与自愈判定结果。 */
export interface CleanSwitchesExtraction {
  switches: SkillSwitches
  isCorrupted: boolean
}

/** volatile 配置字段的最小形态：宿主注入的是 Volatile 引用，普通对象直读。 */
interface MaybeVolatile {
  get?: () => unknown
}

/** 解包单值 volatile 字段。 */
function unwrapValue(value: unknown): unknown {
  return typeof (value as MaybeVolatile | undefined)?.get === 'function' ? (value as MaybeVolatile).get!() : value
}

/**
 * 容灾提取并归一化语言偏好设置。
 * 支持从非标语言码（如 'zh-CN', 'zh_CN', 'en-US', 'chinese' 等）中提取标准三态 ('zh' | 'en' | undefined)。
 */
export function extractCleanLanguage(value: unknown): 'zh' | 'en' | undefined {
  const unwrapped = unwrapValue(value)
  if (typeof unwrapped !== 'string') return undefined
  const lower = unwrapped.trim().toLowerCase().replace(/_/g, '-')
  if (lower === 'zh' || lower.startsWith('zh-') || lower === 'chinese') return 'zh'
  if (lower === 'en' || lower.startsWith('en-') || lower === 'english') return 'en'
  return undefined
}

/**
 * 容灾清洗并提取禁言字典。
 * 1. 过滤原型污染（__proto__, constructor）与未知非法键；
 * 2. 宽容识别非标真值（true, "true", 1, "1", "yes", "on", "disabled"）；
 * 3. 忽略假值（false, "false", 0, "no", "off" 等）。
 */
export function extractCleanDisabled(value: unknown): Record<string, boolean> {
  const unwrapped = unwrapValue(value)
  if (typeof unwrapped !== 'object' || unwrapped === null || Array.isArray(unwrapped)) {
    return Object.create(null)
  }
  const clean: Record<string, boolean> = Object.create(null)
  for (const [key, val] of Object.entries(unwrapped)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    if (!KNOWN_SKILLS.has(key)) continue
    if (
      val === true ||
      val === 'true' ||
      val === 1 ||
      val === '1' ||
      val === 'yes' ||
      val === 'on' ||
      val === 'disabled'
    ) {
      clean[key] = true
    }
  }
  return clean
}

/**
 * 纯函数探测配置是否包含损坏数据、非标格式或需要自愈修复的结构。
 */
export function isConfigCorrupted(config: unknown): boolean {
  if (config === null || config === undefined) return false
  const source = unwrapValue(config)
  if (typeof source !== 'object' || Array.isArray(source)) return true

  const record = source as Record<string, unknown>
  const rawDisabled = unwrapValue(record['disabled'])
  if (rawDisabled !== undefined && rawDisabled !== null) {
    if (typeof rawDisabled !== 'object' || Array.isArray(rawDisabled)) return true
    for (const [k, v] of Object.entries(rawDisabled as Record<string, unknown>)) {
      if (!KNOWN_SKILLS.has(k)) return true
      if (v !== true) return true // 包含非标准布尔值（如字符串或数字），或者包含 false 残留
    }
  }

  const rawLang = unwrapValue(record['language'])
  if (rawLang !== undefined && rawLang !== null && rawLang !== 'zh' && rawLang !== 'en') {
    return true
  }

  return false
}

/**
 * 容灾提取完整技能开关与语言偏好。
 * 兼容 volatile 引用、普通对象、新旧表回退以及脏数据自愈清洗。
 */
export function extractCleanSwitches(config: unknown): SkillSwitches {
  if (config === null || config === undefined) {
    return { disabled: {}, language: undefined }
  }
  const source = unwrapValue(config)
  if (typeof source !== 'object' || Array.isArray(source)) {
    return { disabled: {}, language: undefined }
  }

  const record = source as Record<string, unknown>
  const disabled = extractCleanDisabled(record['disabled'])
  const language = extractCleanLanguage(record['language'])

  if (Object.keys(disabled).length > 0) {
    return { disabled, language }
  }

  // 新表为空时，容灾扫描旧表并提取并集
  const legacyModel = extractCleanDisabled(record['modelDisabled'])
  const legacyUser = extractCleanDisabled(record['userDisabled'])
  const legacy = { ...legacyModel, ...legacyUser }

  return { disabled: legacy, language }
}

/**
 * 读取禁言字典与语言偏好（委托容灾自愈提取引擎）。
 */
export function readSwitches(config: unknown): SkillSwitches {
  return extractCleanSwitches(config)
}

/**
 * 用禁言表覆盖一个技能条目的 invocation 策略，返回新对象且不修改入参。
 */
export function applySwitches<T extends { name: string; invocation: SkillInvocationPolicy }>(
  entry: T,
  switches: SkillSwitches,
): T {
  if (switches.disabled[entry.name] !== true) return { ...entry }
  return {
    ...entry,
    invocation: { modelInvocable: false, userInvocable: false },
  }
}

/**
 * 开关语义自检：随 SkillCatalog.verifySpecification 一并进入质量门禁。
 */
export const SkillSwitches = {
  /**
   * 执行边界契约与容灾自愈断言。
   */
  async selfTest(): Promise<{ name: string; ok: boolean; error?: string }[]> {
    const results: { name: string; ok: boolean; error?: string }[] = []
    const run = async (name: string, fn: () => Promise<void> | void) => {
      try {
        await fn()
        results.push({ name, ok: true })
      } catch (err: unknown) {
        results.push({ name, ok: false, error: (err as Error)?.message ?? String(err) })
      }
    }

    const entry = () => ({
      name: 'switch-test',
      invocation: { modelInvocable: true, userInvocable: true },
    })

    await run('禁用时两侧同时关闭且入参不变', () => {
      const original = entry()
      const out = applySwitches(original, { disabled: { 'switch-test': true }, language: 'zh' })
      if (out.invocation.modelInvocable !== false) throw new Error('modelInvocable 未被关闭')
      if (out.invocation.userInvocable !== false) throw new Error('userInvocable 未被关闭')
      if (original.invocation.modelInvocable !== true) throw new Error('入参被就地修改')
    })

    await run('字典缺项视为启用', () => {
      const out = applySwitches(entry(), { disabled: {}, language: 'zh' })
      if (!out.invocation.modelInvocable || !out.invocation.userInvocable) {
        throw new Error('缺项被误判为禁用')
      }
    })

    await run('无关技能名不影响他人', () => {
      const out = applySwitches(entry(), { disabled: { 'other-skill': true }, language: 'zh' })
      if (!out.invocation.modelInvocable) throw new Error('无关键误伤了本技能')
    })

    await run('新表非空时忽略旧表', () => {
      const out = readSwitches({
        disabled: { 'brainstorming': true },
        modelDisabled: { 'systematic-debugging': true },
        userDisabled: { 'writing-plans': true },
      })
      if (Object.keys(out.disabled).length !== 1 || out.disabled['brainstorming'] !== true) {
        throw new Error('disabled 非空却仍读到了旧表的键')
      }
    })

    await run('默认语言为 undefined（跟随宿主）', () => {
      const out = readSwitches({})
      if (out.language !== undefined) throw new Error('默认语言应为 undefined: ' + out.language)
    })

    await run('language=en 时正确返回', () => {
      const out = readSwitches({ language: 'en' })
      if (out.language !== 'en') throw new Error('language 未读取为 en')
    })

    await run('language 不影响禁言表', () => {
      const out = readSwitches({ language: 'en', disabled: { 'brainstorming': true } })
      if (Object.keys(out.disabled).length !== 1) throw new Error('language 读取影响禁言表')
    })

    await run('新表为空时并入两张旧表', () => {
      const out = readSwitches({
        disabled: {},
        modelDisabled: { 'brainstorming': true },
        userDisabled: { 'writing-plans': true, 'systematic-debugging': true },
      })
      const keys = Object.keys(out.disabled).sort()
      if (keys.length !== 3 || keys.join(',') !== 'brainstorming,systematic-debugging,writing-plans') {
        throw new Error('旧表并集不完整，实际 ' + keys.join(','))
      }
    })

    // -----------------------------------------------------------------------
    // 容灾自愈提取与损坏感知断言
    // -----------------------------------------------------------------------

    await run('容灾自愈：非标布尔值与脏数据精准提取', () => {
      const out = readSwitches({
        disabled: {
          'brainstorming': 'true',
          'writing-plans': 1,
          'executing-plans': 'yes',
          'systematic-debugging': false,
          'unknown-skill': true, // 未知键过滤
        },
      })
      if (out.disabled['brainstorming'] !== true) throw new Error('未能从字符串 "true" 提取布尔')
      if (out.disabled['writing-plans'] !== true) throw new Error('未能从数字 1 提取布尔')
      if (out.disabled['executing-plans'] !== true) throw new Error('未能从 "yes" 提取布尔')
      if (out.disabled['systematic-debugging']) throw new Error('假值被误判为禁用')
      if (out.disabled['unknown-skill']) throw new Error('未知技能名未被过滤')
    })

    await run('容灾自愈：非标区域语言代码归一化', () => {
      if (extractCleanLanguage('zh-CN') !== 'zh') throw new Error('zh-CN 未归一化为 zh')
      if (extractCleanLanguage('zh_Hans') !== 'zh') throw new Error('zh_Hans 未归一化为 zh')
      if (extractCleanLanguage('en-US') !== 'en') throw new Error('en-US 未归一化为 en')
      if (extractCleanLanguage('english') !== 'en') throw new Error('english 未归一化为 en')
      if (extractCleanLanguage('invalid-language') !== undefined) throw new Error('非法语言未回退至 undefined')
    })

    await run('容灾自愈：原型污染与非对象极值绝对防御', () => {
      const fromString = readSwitches('corrupted-non-object-string')
      if (Object.keys(fromString.disabled).length !== 0) throw new Error('字符串输入未安全回退')

      const polluted = JSON.parse('{"disabled": {"__proto__": {"polluted": true}, "brainstorming": true}}')
      const clean = extractCleanDisabled(polluted.disabled)
      if (Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')) {
        throw new Error('发生原型污染')
      }
      if (clean['brainstorming'] !== true) throw new Error('合法技能丢失')
    })

    await run('损坏感知：精准判定配置是否需要自愈', () => {
      if (isConfigCorrupted({ disabled: {}, language: 'zh' }) !== false) throw new Error('干净配置被误判为损坏')
      if (isConfigCorrupted({ disabled: 'bad' }) !== true) throw new Error('字符串 disabled 未被标记为损坏')
      if (isConfigCorrupted({ language: 'zh-CN' }) !== true) throw new Error('非标语言未被标记为损坏')
      if (isConfigCorrupted({ disabled: { 'unknown-bad-skill': true } }) !== true) throw new Error('未知脏键未被标记为损坏')
      if (isConfigCorrupted({ disabled: { 'brainstorming': 'true' } }) !== true) throw new Error('非标布尔值未被标记为损坏')
    })

    return results
  },
}
