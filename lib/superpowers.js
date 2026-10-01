/**
 * @wenaixi/dsh-superpower — DSH 移植版 Superpowers
 *
 * 将 obra/superpowers 的 15 个 skill 以 DSH 原生 SkillProvider 形式暴露，
 * 通过 ctx.skills.registerProvider 注入全局层，rank 10 使本插件技能优先级最高：
 * 小于 dsh-skill-filesystem 的项目/用户根（100–500）与官方 bundled（600）。
 */
import { readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Schema from '@deepseek-ai/schemastery';
import { SkillDocument } from './document.js';
// 具名导出 SkillDocument，为验证治理与测试表面提供统一深度接口
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
// Provider 实现 — 纯调度与生命周期治理，具体解析与映射委托给 SkillDocument 深度模块
// ---------------------------------------------------------------------------
class SuperpowersProvider {
    name;
    skillDir;
    ctx;
    constructor(ctx, _control, config) {
        assertNotRuntimeProvider(config.providerName);
        this.ctx = ctx;
        this.name = config.providerName;
        this.skillDir = resolveDefaultSkillDir(config.skillDir);
    }
    async list(options) {
        options.signal?.throwIfAborted();
        const candidates = [];
        const seen = new Set();
        let entries;
        try {
            entries = await readdir(this.skillDir, { withFileTypes: true, signal: options.signal });
        }
        catch (err) {
            const code = err?.code;
            if (code === 'ENOENT' || code === 'ENOTDIR') {
                this.ctx.logger.warn(`[superpowers] skillDir not found: ${this.skillDir}`);
                return [];
            }
            throw err;
        }
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            options.signal?.throwIfAborted();
            if (!entry.isDirectory())
                continue;
            if (entry.name.startsWith('.'))
                continue;
            const skillPath = join(this.skillDir, entry.name, 'SKILL.md');
            try {
                await stat(skillPath);
            }
            catch (err) {
                const code = err?.code;
                this.ctx.logger.debug(`[superpowers] skip ${entry.name}: no SKILL.md (${code ?? String(err)})`);
                continue;
            }
            let doc;
            try {
                doc = await SkillDocument.fromFile(skillPath, options.signal);
            }
            catch (err) {
                this.ctx.logger.warn(`[superpowers] skip ${skillPath}: 解析失败 — ${String(err)}`);
                continue;
            }
            if (seen.has(doc.name)) {
                this.ctx.logger.warn(`[superpowers] skip ${skillPath}: duplicate skill name "${doc.name}"`);
                continue;
            }
            // 目录名与 skill name 不一致时以 frontmatter 为准，但打印提示
            if (doc.name !== entry.name) {
                this.ctx.logger.warn(`[superpowers] skill name "${doc.name}" != directory "${entry.name}" (using frontmatter)`);
            }
            seen.add(doc.name);
            candidates.push(doc.toCandidate(this.name, SUPERPOWERS_RANK));
        }
        return candidates;
    }
    async get(candidate, options) {
        options.signal?.throwIfAborted();
        const locator = candidate.locator;
        if (!locator?.path || !locator?.directory)
            return undefined;
        let doc;
        try {
            doc = await SkillDocument.fromFile(locator.path, options.signal);
        }
        catch (err) {
            if (err?.name === 'AbortError')
                throw err;
            const code = err?.code;
            if (code === 'ENOENT')
                return undefined;
            this.ctx.logger.warn(`[superpowers] get ${candidate.name}: read failed (${code ?? String(err)})`);
            return undefined;
        }
        if (doc.name !== candidate.name) {
            // 名称漂移视为失效，触发上层 invalidate
            this.ctx.logger.warn(`[superpowers] get ${candidate.name}: name drift "${doc.name}" != "${candidate.name}"`);
            return undefined;
        }
        return doc.toDefinition(this.name);
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
export default { name, inject, Config, apply, SkillDocument };
//# sourceMappingURL=superpowers.js.map