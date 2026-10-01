/**
 * @wenaixi/dsh-superpower — SkillDocument 深度模块
 *
 * 封装单个技能文档的读取、BOM/CRLF 归一化、YAML frontmatter 解析、
 * 规范字段与调用策略校验，以及向 SkillCandidate 和 SkillDefinition 的契约映射。
 *
 * 核心原则：
 * - Depth: 将大量文件 I/O、边界扫描、YAML 解析与类型收敛封装在紧凑的小接口后；
 * - Locality: 所有 frontmatter 规则与校验逻辑内聚于此；
 * - Test Surface: 对外暴露规范接口，成为运行时与验证脚本的共同测试表面。
 */
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parse } from 'yaml';
import { isSkillName } from '@deepseek-ai/dsh-skill';
// ---------------------------------------------------------------------------
// 内部纯工具函数（封装在模块内部，不泄漏给外部调用方）
// ---------------------------------------------------------------------------
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
function extractFrontmatter(raw) {
    // 去除 Windows 编辑器易带的 UTF-8 BOM 头
    let content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const firstNl = content.indexOf('\n');
    if (firstNl < 0 || content.slice(0, firstNl).replace(/\r$/, '') !== '---') {
        throw new Error('missing opening frontmatter delimiter "---"');
    }
    const start = firstNl + 1;
    const closing = findClosingFrontmatter(content, start);
    if (!closing) {
        throw new Error('missing closing frontmatter delimiter "---"');
    }
    const parsed = parse(content.slice(start, closing.start));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('frontmatter must be a YAML object mapping');
    }
    return {
        data: parsed,
        body: content.slice(closing.bodyStart),
    };
}
// ---------------------------------------------------------------------------
// SkillDocument 深度模块
// ---------------------------------------------------------------------------
export class SkillDocument {
    path;
    name;
    description;
    whenToUse;
    invocation;
    metadata;
    body;
    rawFrontmatterData;
    constructor(filePath, extracted) {
        this.path = filePath;
        this.rawFrontmatterData = extracted.data;
        this.body = extracted.body;
        const skillName = stringField(extracted.data, 'name');
        if (!skillName) {
            throw new Error(`skill at "${filePath}" is missing required frontmatter field "name"`);
        }
        if (!isSkillName(skillName)) {
            throw new Error(`invalid skill name "${skillName}" at "${filePath}" (must be kebab-case)`);
        }
        this.name = skillName;
        const desc = stringField(extracted.data, 'description');
        if (!desc) {
            throw new Error(`skill "${skillName}" at "${filePath}" is missing required frontmatter field "description"`);
        }
        this.description = desc;
        this.whenToUse = stringField(extracted.data, 'whenToUse');
        this.invocation = parseInvocationPolicy(extracted.data);
        const meta = extracted.data['metadata'];
        if (typeof meta === 'object' && meta !== null && !Array.isArray(meta)) {
            this.metadata = meta;
        }
    }
    /**
     * 从指定文件路径异步解析 SkillDocument。
     */
    static async fromFile(filePath, signal) {
        signal?.throwIfAborted();
        const raw = await readFile(filePath, {
            encoding: 'utf8',
            signal,
        });
        signal?.throwIfAborted();
        const extracted = extractFrontmatter(raw);
        return new SkillDocument(filePath, extracted);
    }
    /**
     * 从内存中的原始 markdown 字符串直接解析（用于测试或动态构建）。
     */
    static fromString(raw, filePath = 'SKILL.md') {
        const extracted = extractFrontmatter(raw);
        return new SkillDocument(filePath, extracted);
    }
    /**
     * 映射为 DSH SkillCandidate 契约对象。
     */
    toCandidate(providerName, rank) {
        const dir = dirname(this.path);
        return {
            name: this.name,
            description: this.description,
            ...(this.whenToUse ? { whenToUse: this.whenToUse } : {}),
            invocation: this.invocation,
            source: 'bundled',
            provider: providerName,
            rank,
            locator: { path: this.path, directory: dir },
            resourceBase: { kind: 'directory', path: dir },
            path: this.path,
            ...(this.metadata ? { metadata: this.metadata } : {}),
        };
    }
    /**
     * 映射为 DSH SkillDefinition 契约对象。
     */
    toDefinition(providerName) {
        const dir = dirname(this.path);
        return {
            name: this.name,
            description: this.description,
            ...(this.whenToUse ? { whenToUse: this.whenToUse } : {}),
            invocation: this.invocation,
            source: 'bundled',
            provider: providerName,
            resourceBase: { kind: 'directory', path: dir },
            path: this.path,
            ...(this.metadata ? { metadata: this.metadata } : {}),
            content: this.body.trim(),
        };
    }
}
//# sourceMappingURL=document.js.map