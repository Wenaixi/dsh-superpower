/**
 * dsh-superpower — DSH 移植版 Superpowers
 *
 * 将 obra/superpowers 的 14 个 skill 以 DSH 原生 SkillProvider 形式暴露，
 * 通过 ctx.skills.registerProvider 注入全局层，rank 550 使 project 级 skill 可覆盖。
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { isSkillName } from '@deepseek-ai/dsh-skill';
import Schema from '@deepseek-ai/schemastery';
// ---------------------------------------------------------------------------
// Config — 默认值写在 schema 里；可选字段用可选属性声明
// ---------------------------------------------------------------------------
export const Config = Schema.object({
    /** 注册到 ctx.skills 的 provider 名称，默认为 superpowers；不可为保留名 runtime */
    providerName: Schema.string().default('superpowers'),
    /** skill 目录绝对路径，默认取包内 skills/；便于本地调试指向其他目录 */
    skillDir: Schema.string(),
}).description('dsh-superpower 插件配置');
// ---------------------------------------------------------------------------
// 插件元信息
// ---------------------------------------------------------------------------
export const name = 'superpowers';
export const inject = ['skills'];
// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------
const SUPERPOWERS_RANK = 550;
const RUNTIME_PROVIDER = 'runtime';
function assertNotRuntimeProvider(providerName) {
    if (providerName === RUNTIME_PROVIDER) {
        throw new Error(`[superpowers] providerName "${RUNTIME_PROVIDER}" 为保留名，不可用`);
    }
}
function stringField(data, key) {
    const v = data[key];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}
function optionalString(data, key) {
    const v = data[key];
    return typeof v === 'string' && v.length > 0 ? { [key]: v } : {};
}
function frontmatterBoolean(data, key) {
    if (!Object.hasOwn(data, key))
        return undefined;
    const v = data[key];
    if (typeof v === 'boolean')
        return v;
    if (v === 1 || v === '1')
        return true;
    if (v === 0 || v === '0')
        return false;
    if (typeof v === 'string') {
        switch (v.toLowerCase()) {
            case 'true':
            case 'yes':
            case 'on':
                return true;
            case 'false':
            case 'no':
            case 'off':
                return false;
        }
    }
    throw new TypeError(`frontmatter field "${key}" must be a boolean`);
}
function rejectLegacyKey(data, legacy, canonical) {
    if (Object.hasOwn(data, legacy)) {
        throw new Error(`frontmatter field "${legacy}" is unsupported; use "${canonical}"`);
    }
}
function parseInvocationPolicy(data) {
    rejectLegacyKey(data, 'disableModelInvocation', 'disable-model-invocation');
    rejectLegacyKey(data, 'modelInvocable', 'disable-model-invocation');
    rejectLegacyKey(data, 'userInvocable', 'user-invocable');
    const disableModelInvocation = frontmatterBoolean(data, 'disable-model-invocation');
    const userInvocable = frontmatterBoolean(data, 'user-invocable');
    return {
        modelInvocable: disableModelInvocation !== true,
        userInvocable: userInvocable !== false,
    };
}
function optionalMetadata(data) {
    const v = data['metadata'];
    if (typeof v === 'object' && v !== null && !Array.isArray(v))
        return { metadata: v };
    return {};
}
function findClosingFrontmatter(raw, start) {
    let lineStart = start;
    while (lineStart <= raw.length) {
        const nl = raw.indexOf('\n', lineStart);
        const lineEnd = nl < 0 ? raw.length : nl;
        if (raw.slice(lineStart, lineEnd).replace(/\r$/, '') === '---') {
            return { start: lineStart, bodyStart: nl < 0 ? raw.length : nl + 1 };
        }
        if (nl < 0)
            return undefined;
        lineStart = nl + 1;
    }
    return undefined;
}
function parseFrontmatter(raw) {
    // 去 BOM：Windows 编辑器易带 \uFEFF，导致首行非 --- 而被静默跳过
    if (raw.charCodeAt(0) === 0xfeff)
        raw = raw.slice(1);
    const firstNl = raw.indexOf('\n');
    if (firstNl < 0)
        return undefined;
    if (raw.slice(0, firstNl).replace(/\r$/, '') !== '---')
        return undefined;
    const start = firstNl + 1;
    const closing = findClosingFrontmatter(raw, start);
    if (!closing)
        return undefined;
    const parsed = parse(raw.slice(start, closing.start));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        return undefined;
    return { data: parsed, body: raw.slice(closing.bodyStart) };
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
// Provider
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
            let parsed;
            try {
                parsed = await parseSkillFile(skillPath);
            }
            catch (err) {
                this.ctx.logger.warn(`[superpowers] skip ${skillPath}: YAML 解析失败 — ${String(err)}`);
                continue;
            }
            if (!parsed) {
                this.ctx.logger.warn(`[superpowers] skip ${entry.name}: missing or invalid frontmatter`);
                continue;
            }
            const { data } = parsed;
            const skillName = stringField(data, 'name');
            const description = stringField(data, 'description');
            if (!skillName || !description) {
                this.ctx.logger.warn(`[superpowers] skip ${skillPath}: frontmatter requires name and description`);
                continue;
            }
            if (!isSkillName(skillName)) {
                this.ctx.logger.warn(`[superpowers] skip ${skillPath}: invalid skill name "${skillName}"`);
                continue;
            }
            if (seen.has(skillName)) {
                this.ctx.logger.warn(`[superpowers] skip ${skillPath}: duplicate skill name "${skillName}"`);
                continue;
            }
            // 目录名与 skill name 不一致时以 frontmatter 为准，但打印提示
            if (skillName !== entry.name) {
                this.ctx.logger.warn(`[superpowers] skill name "${skillName}" != directory "${entry.name}" (using frontmatter)`);
            }
            let invocation;
            try {
                invocation = parseInvocationPolicy(data);
            }
            catch (e) {
                this.ctx.logger.warn(`[superpowers] skip ${skillPath}: ${String(e)}`);
                continue;
            }
            seen.add(skillName);
            candidates.push({
                name: skillName,
                description,
                ...optionalString(data, 'whenToUse'),
                invocation,
                source: 'bundled',
                provider: this.name,
                rank: SUPERPOWERS_RANK,
                locator: { path: skillPath, directory: dirname(skillPath) },
                resourceBase: { kind: 'directory', path: dirname(skillPath) },
                path: skillPath,
                ...optionalMetadata(data),
            });
        }
        return candidates;
    }
    async get(candidate, options) {
        options.signal?.throwIfAborted();
        const locator = candidate.locator;
        if (!locator?.path || !locator?.directory)
            return undefined;
        let raw;
        try {
            raw = await readFile(locator.path, {
                encoding: 'utf8',
                signal: options.signal,
            });
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
        if (raw === undefined)
            return undefined;
        options.signal?.throwIfAborted();
        const parsed = parseFrontmatter(raw);
        if (!parsed) {
            this.ctx.logger.warn(`[superpowers] get ${candidate.name}: missing or invalid frontmatter`);
            return undefined;
        }
        const data = parsed.data;
        const skillName = stringField(data, 'name');
        const description = stringField(data, 'description');
        if (!skillName || !description) {
            this.ctx.logger.warn(`[superpowers] get ${candidate.name}: frontmatter requires name and description`);
            return undefined;
        }
        if (skillName !== candidate.name) {
            // 名称漂移视为失效，触发上层 invalidate
            this.ctx.logger.warn(`[superpowers] get ${candidate.name}: name drift "${skillName}" != "${candidate.name}"`);
            return undefined;
        }
        let invocation;
        try {
            invocation = parseInvocationPolicy(data);
        }
        catch (e) {
            this.ctx.logger.warn(`[superpowers] get ${candidate.name}: ${String(e)}`);
            return undefined;
        }
        return {
            name: skillName,
            description,
            ...optionalString(data, 'whenToUse'),
            invocation,
            source: 'bundled',
            provider: this.name,
            resourceBase: { kind: 'directory', path: locator.directory },
            path: locator.path,
            ...optionalMetadata(data),
            content: parsed.body.trim(),
        };
    }
}
async function parseSkillFile(path) {
    const raw = await readFile(path, 'utf8');
    const parsed = parseFrontmatter(raw);
    if (!parsed)
        return undefined;
    return parsed;
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
export default { name, inject, Config, apply };
//# sourceMappingURL=superpowers.js.map