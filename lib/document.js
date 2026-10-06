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
/**
 * 定位 frontmatter 闭合行。契约边界（不支持形态在此钉死）：
 * - 多 YAML 文档（frontmatter 内出现列 0 的 '---'）会被当作闭合边界，第二文档
 *   整体落入正文——当前由「YAML 必须是 object」校验兜底为显式报错；未来若技能
 *   正文合法写成多文档，此注释需先行更新为显式拒绝；
 * - 尾部 CRLF 归一：仅剥单个 '\r'，'\r\r\n' 形态不在支持范围。
 */
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
    /** 中文描述（frontmatter description_zh）；缺失时回退到 description。 */
    descriptionZh;
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
        const descZh = stringField(extracted.data, 'description_zh');
        this.descriptionZh = descZh ?? desc;
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
     * 执行 SkillDocument 核心边界契约规范自检（接口即测试表面）。
     */
    static async selfTest() {
        const results = [];
        const runCheck = async (name, fn) => {
            try {
                await fn();
                results.push({ name, ok: true });
            }
            catch (err) {
                results.push({ name, ok: false, error: err?.message ?? String(err) });
            }
        };
        await runCheck('BOM 剥离', () => {
            const d = SkillDocument.fromString('\uFEFF---\nname: bom-test\ndescription: d\n---\nbody');
            if (d.name !== 'bom-test')
                throw new Error('BOM 未剥离: ' + JSON.stringify(d.name));
        });
        await runCheck('CRLF 归一', () => {
            const d = SkillDocument.fromString('---\r\nname: crlf-test\r\ndescription: d\r\n---\r\nbody');
            if (d.body.trim() !== 'body')
                throw new Error('CRLF 归一失败: ' + JSON.stringify(d.body));
        });
        await runCheck('kebab 校验', () => {
            let threw = null;
            try {
                SkillDocument.fromString('---\nname: Not_Kebab\ndescription: d\n---\n');
            }
            catch (e) {
                threw = e;
            }
            if (!threw || !/kebab/.test(String(threw?.message)))
                throw new Error('未抛 kebab 错误: ' + String(threw));
        });
        await runCheck('缺 name 报错', () => {
            let threw = null;
            try {
                SkillDocument.fromString('---\ndescription: d\n---\n');
            }
            catch (e) {
                threw = e;
            }
            if (!threw || !/name/.test(String(threw?.message)))
                throw new Error('未抛缺 name 错误: ' + String(threw));
        });
        await runCheck('缺 description 报错', () => {
            let threw = null;
            try {
                SkillDocument.fromString('---\nname: x-test\n---\n');
            }
            catch (e) {
                threw = e;
            }
            if (!threw || !/description/.test(String(threw?.message)))
                throw new Error('未抛缺 description 错误: ' + String(threw));
        });
        await runCheck('abort 中止', async () => {
            const ctrl = new AbortController();
            ctrl.abort();
            let threw = null;
            try {
                await SkillDocument.fromFile('non-existent-whatever.md', ctrl.signal);
            }
            catch (e) {
                threw = e;
            }
            if (!threw || threw.name !== 'AbortError')
                throw new Error('未抛 AbortError: ' + (threw?.name ?? '无'));
        });
        return results;
    }
    /**
     * 按语言偏好返回展示描述：zh 用 description_zh（缺省回退），其余（含 en）用 description。
     */
    descriptionFor(language) {
        return language === 'zh' ? this.descriptionZh : this.description;
    }
    /**
     * 映射为 DSH SkillCandidate 契约对象。
     */
    toCandidate(providerName, rank, language) {
        const dir = dirname(this.path);
        return {
            name: this.name,
            description: this.descriptionFor(language),
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
    toDefinition(providerName, language) {
        const dir = dirname(this.path);
        return {
            name: this.name,
            description: this.descriptionFor(language),
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