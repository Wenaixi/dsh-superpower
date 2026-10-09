/**
 * @wenaixi/dsh-superpower — DSH 移植版 Superpowers
 *
 * 将 obra/superpowers 的 15 个 skill 以 DSH 原生 SkillProvider 形式暴露，
 * 通过 ctx.skills.registerProvider 注入全局层，rank 10 使本插件技能优先级最高：
 * 小于 dsh-skill-filesystem 的项目/用户根（100–500）与官方 bundled（600）。
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context, Volatile } from '@deepseek-ai/cordis'
import type {
  SkillCandidate,
  SkillDefinition,
  SkillLookupOptions,
  SkillProvider,
  SkillProviderControl,
} from '@deepseek-ai/dsh-skill'
import Schema from '@deepseek-ai/schemastery'
import { SkillCatalog } from './catalog.js'
import { SkillDocument } from './document.js'
import { applySwitches, readSwitches, type SkillSwitches } from './switches.js'

// 具名导出深度模块，为验证治理与测试表面提供统一深度接口
export { SkillCatalog, EXPECTED_SKILL_COUNT, type SpecificationReport } from './catalog.js'
export { SkillDocument, type SpecificationTestResult } from './document.js'
export { SkillSwitches, applySwitches, readSwitches } from './switches.js'

// ---------------------------------------------------------------------------
// 事件类型补全 — loader/volatile-update 由 cordis-plugin-loader 声明，
// 而该包在本包依赖图之外（pnpm isolated 布局下不可解析），
// 故在此按官方插件同样的声明合并方式补上，让开关监听获得类型。
// ---------------------------------------------------------------------------

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * volatile 配置值已在不重挂载的情况下提交给运行中的 fiber；派发给所属 fiber。
     * @param paths - 变更的配置路径数组
     * @mode emit
     */
    'loader/volatile-update'(paths: readonly (readonly string[])[]): void
    /**
     * 宿主配置重载通知（在 profile 补丁应用后广播），宿主界面语言变更经此收敛。
     * @mode emit
     */
    'app-boot/config-reload'(): void
  }
}

// ---------------------------------------------------------------------------
// Config — 默认值写在 schema 里；可选字段用可选属性声明
// ---------------------------------------------------------------------------

export const Config = Schema.object({
  /** 注册到 ctx.skills 的 provider 名称，默认为 superpowers；不可为保留名 runtime */
  providerName: Schema.string().default('superpowers'),
  /** skill 目录绝对路径，默认取包内 skills/；便于本地调试指向其他目录 */
  skillDir: Schema.string(),
  /**
   * 禁言表：键为技能名，值为 true 时该技能对模型与对用户同时关闭。
   *
   * 这是唯一写入目标。面板完成一次写入时会顺手 unset 下面两个已废弃字段，
   * 所以 profile 里最终只剩这一张表。
   */
  disabled: Schema.dict(Schema.boolean()).default({}).volatile(),
  /**
   * 技能正文与描述的显示语言偏好：'zh' 中文（默认）或 'en' 英文。
   * volatile 字段：面板可经 ConfigForm 通道写入，改后随 loader/volatile-update 事件
   * 让 Provider 在下轮 list/get 读到新语言。
   */
  language: Schema.union(['zh', 'en']).required(false).volatile(),
  /**
   * 已废弃的模型侧禁言表，面板不再写入，只在迁移批里被 unset 清空。
   *
   * 必须留着声明，否则 profile 的 cordis.patch.yml 里的旧键会被 schema 丢弃，
   * 用户历史开关一次性消失。必须留着 .volatile()，因为宿主 Settings 的写入闸门
   * 只接受 volatile 路径：dsh-settings 的 write 逐条校验 op.path 是否落在某个
   * volatile 节点下，命中不了就抛 `Config field "modelDisabled" is not volatile`
   * 并让整批 mutate 失败。少一个 volatile，整条迁移批连同主写入一起被拒。
   */
  modelDisabled: Schema.dict(Schema.boolean()).default({}).volatile(),
  /** 已废弃的用户侧禁言表，理由同 modelDisabled。 */
  userDisabled: Schema.dict(Schema.boolean()).default({}).volatile(),
})
  // 断言为 Schema<Config>：volatile() 的输出类型来自 schemastery 的传递依赖 cosmokit，
  // 在 pnpm isolated 布局下它只能经 .pnpm 内部路径引用，tsc 的声明发射拒绝写出这种
  // 不可移植路径（TS2742）。Config 接口已用 cordis 重导出的 Volatile 精确描述同一形状，
  // 断言只是让声明发射改写这个 specifier，不改变任何运行时行为。
  .description('@wenaixi/dsh-superpower 插件配置') as unknown as Schema<Config>

export interface Config {
  providerName: string
  skillDir?: string
  /** 技能描述显示语言偏好：'zh'/'en' 显式固定；缺失（undefined）时跟随宿主界面语言。 */
  language: Volatile<'zh' | 'en' | undefined>
  /** 唯一的开关写入目标：键为技能名，值为 true 时模型与用户两侧同时关闭 */
  disabled: Volatile<Record<string, boolean>>
  /** 已废弃的历史禁言表，面板不再写入，只在迁移批里被 unset 清空 */
  modelDisabled: Volatile<Record<string, boolean>>
  /** 已废弃的历史禁言表，理由同 modelDisabled */
  userDisabled: Volatile<Record<string, boolean>>
}

// ---------------------------------------------------------------------------
// 插件元信息
// ---------------------------------------------------------------------------

export const name = 'superpowers'
export const inject = ['skills'] as const

// ---------------------------------------------------------------------------
// 常量与校验
// ---------------------------------------------------------------------------

// 本插件技能优先级最高：rank 值越小优先级越高（官方注册表升序裁决），
// 10 低于 filesystem 项目/用户根(100–500) 与官方 bundled(600)。
const SUPERPOWERS_RANK = 10
const RUNTIME_PROVIDER = 'runtime'

function assertNotRuntimeProvider(providerName: string): void {
  if (providerName === RUNTIME_PROVIDER) {
    throw new Error(`[superpowers] providerName "${RUNTIME_PROVIDER}" 为保留名，不可用`)
  }
}

function resolveDefaultSkillDir(configSkillDir?: string): string {
  if (configSkillDir) return resolve(configSkillDir)
  // 包内 skills/ 目录：相对于本文件 lib/superpowers.js -> ../skills
  // ESM 产物下 import.meta.url 始终可用，不做静默降级；解析失败则让调用方感知
  const here = fileURLToPath(import.meta.url)
  return resolve(dirname(here), '..', 'skills')
}

// ---------------------------------------------------------------------------
// Provider 实现 — 纯调度与生命周期治理，具体编目、快照与文档解析委托给 SkillCatalog 深度模块
// ---------------------------------------------------------------------------

class SuperpowersProvider implements SkillProvider {
  readonly name: string
  readonly catalog: SkillCatalog
  private readonly ctx: Context
  private readonly control: SkillProviderControl
  private readonly currentSwitches: () => SkillSwitches
  private hostLanguageCache: 'zh' | 'en' | undefined
  private hostLanguageResolved = false

  constructor(ctx: Context, control: SkillProviderControl, config: Config) {
    assertNotRuntimeProvider(config.providerName)
    this.ctx = ctx
    this.control = control
    this.name = config.providerName
    const skillDir = resolveDefaultSkillDir(config.skillDir)
    this.catalog = new SkillCatalog(skillDir)
    // 每次调用重新解包 volatile 引用，保证开关在运行中被改后立即可见
    this.currentSwitches = () => readSwitches(config)
  }

  /**
   * 宿主界面语言：读 dsh-settings 的 locale 条目 preference（volatile）。
   * settings 服务缺失（端到端 mock、纯 Registry 上下文）或 preference 缺省时返回 undefined，
   * 由调用方回退到 zh。结果缓存，locale preference 变更经 loader/volatile-update 清空。
   */
  hostLanguage(): 'zh' | 'en' | undefined {
    if (this.hostLanguageResolved) return this.hostLanguageCache
    let locale: 'zh' | 'en' | undefined
    try {
      const described = this.ctx.get('settings')?.describe()
      const forms = (Array.isArray(described) ? described : (described as { namespaces?: unknown })?.namespaces ?? []) as { ns?: string; value?: unknown }[]
      const entry = forms.find((d) => d !== null && typeof d === 'object' && d.ns === 'locale')
      const preference = (entry?.value as { preference?: unknown } | undefined)?.preference
      locale = preference === 'en' ? 'en' : preference === 'zh' ? 'zh' : undefined
    } catch {
      locale = undefined
    }
    // ponytail: 结果缓存 + volatile-update 失效；describe 每次全量扫描，缓存避免每轮 list 重扫
    this.hostLanguageCache = locale
    this.hostLanguageResolved = true
    return locale
  }

  /**
   * 让宿主注册表丢弃本 provider 的编目缓存并广播 skills/change，
   * 同时让本包自己的候选快照重算。缺任一方都会导致开关显示已更新而模型侧目录不变。
   */
  invalidate(): void {
    this.control.invalidate()
    this.catalog.invalidate()
    this.hostLanguageCache = undefined
    this.hostLanguageResolved = false
  }

  async list(options: SkillLookupOptions): Promise<readonly SkillCandidate[]> {
    const switches = this.currentSwitches()
    return this.catalog.listCandidates(this.name, SUPERPOWERS_RANK, {
      signal: options.signal,
      logger: this.ctx.logger,
      language: switches.language ?? this.hostLanguage(),
      switches,
    })
  }

  async get(candidate: SkillCandidate, options: SkillLookupOptions): Promise<SkillDefinition | undefined> {
    const switches = this.currentSwitches()
    return this.catalog.getDefinition(candidate, this.name, {
      signal: options.signal,
      logger: this.ctx.logger,
      language: switches.language ?? this.hostLanguage(),
      switches,
    })
  }
}

// ---------------------------------------------------------------------------
// 插件入口 — 所有副作用走 ctx 注册，随 fiber 卸载自动清理
// ---------------------------------------------------------------------------

export function apply(ctx: Context, config: Config): void {
  assertNotRuntimeProvider(config.providerName)

  ctx.logger.info(`[superpowers] registering provider "${config.providerName}"`)

  // 将 provider 注册与事件监听放入同一个 effect，保证卸载时的清理顺序可控
  ctx.effect(() => {
    let activeProvider: SuperpowersProvider | undefined

    const disposeProvider = ctx.skills.registerProvider((control) => {
      activeProvider = new SuperpowersProvider(ctx, control, config)
      return activeProvider
    })

    // skills/change 为 emit 模式，感知外部变更并精准失效内存快照
    const disposeListener = ctx.on('skills/change', () => {
      ctx.logger.debug('[superpowers] skills catalog changed, invalidating snapshot')
      activeProvider?.catalog.invalidate()
    })

    // 技能开关是 volatile 配置字段，改动不重挂载插件但会派发此事件。
    // 借它让宿主注册表丢弃编目缓存并广播 skills/change，模型侧下一轮即可拿到新目录。
    const disposeVolatile = ctx.on('loader/volatile-update', () => {
      ctx.logger.debug('[superpowers] skill switches updated, invalidating catalog')
      activeProvider?.invalidate()
    })

    // 宿主语言变更的收敛点：locale.preference 属另一个 profile 条目，它的 loader/volatile-update
    // 只在那条插件自己的 fiber 上广播，本插件收不到。宿主每次应用补丁后广播
    // app-boot/config-reload，在此让技能目录失效并清空 hostLanguageCache：
    // 未配置语言的用户切换宿主语言后，模型侧目录与斜杠菜单才跟着换语言。
    const disposeReload = ctx.on('app-boot/config-reload', () => {
      ctx.logger.debug('[superpowers] host config reloaded, invalidating catalog (host language may have changed)')
      activeProvider?.invalidate()
    })

    return () => {
      // 逆序释放：先摘监听，再注销 provider，最后清理自身快照
      disposeReload()
      disposeVolatile()
      disposeListener()
      disposeProvider()
      activeProvider?.catalog.invalidate()
    }
  })
}

export default { name, inject, Config, apply, SkillDocument, SkillCatalog }