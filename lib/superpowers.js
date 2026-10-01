/**
 * @wenaixi/dsh-superpower — DSH 移植版 Superpowers
 *
 * 将 obra/superpowers 的 15 个 skill 以 DSH 原生 SkillProvider 形式暴露，
 * 通过 ctx.skills.registerProvider 注入全局层，rank 10 使本插件技能优先级最高：
 * 小于 dsh-skill-filesystem 的项目/用户根（100–500）与官方 bundled（600）。
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Schema from '@deepseek-ai/schemastery';
import { SkillCatalog } from './catalog.js';
import { SkillDocument } from './document.js';
// 具名导出深度模块，为验证治理与测试表面提供统一深度接口
export { SkillCatalog } from './catalog.js';
export { SkillDocument } from './document.js';
// ---------------------------------------------------------------------------
// Config — 默认值写在 schema 里；可选字段用可选属性声明
// ---------------------------------------------------------------------------
export const Config = Schema.object({
    /** 注册到 ctx.skills 的 provider 名称，默认为 superpowers；不可为保留名 runtime */
    providerName: Schema.string().default('superpowers'),
    /** skill 目录绝对路径，默认取包内 skills/；便于本地调试指向其他目录 */
    skillDir: Schema.string(),
}).description('@wenaixi/dsh-superpower 插件配置');
// ---------------------------------------------------------------------------
// 插件元信息
// ---------------------------------------------------------------------------
export const name = 'superpowers';
export const inject = ['skills'];
// ---------------------------------------------------------------------------
// 常量与校验
// ---------------------------------------------------------------------------
// 本插件技能优先级最高：rank 值越小优先级越高（官方注册表升序裁决），
// 10 低于 filesystem 项目/用户根(100–500) 与官方 bundled(600)。
const SUPERPOWERS_RANK = 10;
const RUNTIME_PROVIDER = 'runtime';
function assertNotRuntimeProvider(providerName) {
    if (providerName === RUNTIME_PROVIDER) {
        throw new Error(`[superpowers] providerName "${RUNTIME_PROVIDER}" 为保留名，不可用`);
    }
}
function resolveDefaultSkillDir(configSkillDir) {
    if (configSkillDir)
        return resolve(configSkillDir);
    // 包内 skills/ 目录：相对于本文件 lib/superpowers.js -> ../skills
    // ESM 产物下 import.meta.url 始终可用，不做静默降级；解析失败则让调用方感知
    const here = fileURLToPath(import.meta.url);
    return resolve(dirname(here), '..', 'skills');
}
// ---------------------------------------------------------------------------
// Provider 实现 — 纯调度与生命周期治理，具体编目与文档解析委托给 SkillCatalog 深度模块
// ---------------------------------------------------------------------------
class SuperpowersProvider {
    name;
    skillDir;
    ctx;
    catalog;
    constructor(ctx, _control, config) {
        assertNotRuntimeProvider(config.providerName);
        this.ctx = ctx;
        this.name = config.providerName;
        this.skillDir = resolveDefaultSkillDir(config.skillDir);
    }
    async list(options) {
        this.catalog = await SkillCatalog.fromDirectory(this.skillDir, {
            signal: options.signal,
            logger: this.ctx.logger,
        });
        return this.catalog.listCandidates(this.name, SUPERPOWERS_RANK);
    }
    async get(candidate, options) {
        if (!this.catalog) {
            this.catalog = await SkillCatalog.fromDirectory(this.skillDir, {
                signal: options.signal,
                logger: this.ctx.logger,
            });
        }
        return this.catalog.getDefinition(candidate, this.name, {
            signal: options.signal,
            logger: this.ctx.logger,
        });
    }
}
// ---------------------------------------------------------------------------
// 插件入口 — 所有副作用走 ctx 注册，随 fiber 卸载自动清理
// ---------------------------------------------------------------------------
export function apply(ctx, config) {
    assertNotRuntimeProvider(config.providerName);
    ctx.logger.info(`[superpowers] registering provider "${config.providerName}"`);
    // 将 provider 注册与事件监听放入同一个 effect，保证卸载时的清理顺序可控
    ctx.effect(() => {
        const disposeProvider = ctx.skills.registerProvider((control) => {
            return new SuperpowersProvider(ctx, control, config);
        });
        // skills/change 为 emit 模式（见 @deepseek-ai/dsh-skill Events 定义：@mode emit），非 waterfall，无需 next()
        const disposeListener = ctx.on('skills/change', () => {
            ctx.logger.debug('[superpowers] skills catalog changed');
        });
        return () => {
            disposeListener();
            disposeProvider();
        };
    });
}
export default { name, inject, Config, apply, SkillDocument, SkillCatalog };
//# sourceMappingURL=superpowers.js.map