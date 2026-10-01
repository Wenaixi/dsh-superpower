/**
 * @wenaixi/dsh-superpower — SkillCatalog 深度模块
 *
 * 封装技能目录的发现、遍历、健康探测、排重、名称漂移校验与索引检索。
 *
 * 核心设计：
 * - Depth: 将大量文件系统遍历、stat 存活探测、去重与错误处理隐藏在极简接口之后；
 * - Locality: 集中管理技能目录发现逻辑与规范一致性规则；
 * - Leverage: 同时支撑 SuperpowersProvider 运行时与 verify.mjs 质检治理。
 */
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { SkillDocument } from './document.js';
export class SkillCatalog {
    skillDir;
    entriesByName = new Map();
    entriesByDir = new Map();
    duplicates = [];
    missingSkillMd = [];
    loadErrors = [];
    constructor(skillDir) {
        this.skillDir = skillDir;
    }
    /**
     * 从指定目录异步扫描并构建 SkillCatalog 深度实例。
     */
    static async fromDirectory(skillDir, options) {
        options?.signal?.throwIfAborted();
        const catalog = new SkillCatalog(skillDir);
        await catalog.scan(options);
        return catalog;
    }
    async scan(options) {
        const signal = options?.signal;
        const logger = options?.logger;
        let dirents;
        try {
            dirents = await readdir(this.skillDir, { withFileTypes: true, signal });
        }
        catch (err) {
            const code = err?.code;
            if (code === 'ENOENT' || code === 'ENOTDIR') {
                logger?.warn(`[SkillCatalog] skillDir not found: ${this.skillDir}`);
                return;
            }
            throw err;
        }
        const sorted = dirents.filter((e) => e.isDirectory() && !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of sorted) {
            signal?.throwIfAborted();
            const skillPath = join(this.skillDir, entry.name, 'SKILL.md');
            try {
                await stat(skillPath);
            }
            catch (err) {
                const code = err?.code;
                logger?.debug?.(`[SkillCatalog] skip ${entry.name}: no SKILL.md (${code ?? String(err)})`);
                this.missingSkillMd.push(entry.name);
                continue;
            }
            let doc;
            try {
                doc = await SkillDocument.fromFile(skillPath, signal);
            }
            catch (err) {
                const msg = String(err?.message ?? err);
                logger?.warn(`[SkillCatalog] skip ${skillPath}: parse failed — ${msg}`);
                this.loadErrors.push({ path: skillPath, error: msg });
                continue;
            }
            if (this.entriesByName.has(doc.name)) {
                logger?.warn(`[SkillCatalog] skip ${skillPath}: duplicate skill name "${doc.name}"`);
                this.duplicates.push(doc.name);
                continue;
            }
            const nameDrift = doc.name !== entry.name;
            if (nameDrift) {
                logger?.warn(`[SkillCatalog] skill name "${doc.name}" != directory "${entry.name}" (using frontmatter)`);
            }
            const catalogEntry = {
                directoryName: entry.name,
                skillPath,
                document: doc,
                nameDrift,
            };
            this.entriesByName.set(doc.name, catalogEntry);
            this.entriesByDir.set(entry.name, catalogEntry);
        }
    }
    /**
     * 将当前目录下的所有有效技能映射为 DSH SkillCandidate 数组。
     */
    listCandidates(providerName, rank) {
        const candidates = [];
        for (const entry of this.entriesByName.values()) {
            candidates.push(entry.document.toCandidate(providerName, rank));
        }
        return candidates;
    }
    /**
     * 根据候选技能的 locator 与名称解析出完整 SkillDefinition。
     * 优先命中内存缓存；若路径变动则重新读取文件并检查名称一致性。
     */
    async getDefinition(candidate, providerName, options) {
        options?.signal?.throwIfAborted();
        const locator = candidate.locator;
        if (!locator?.path)
            return undefined;
        // 优先命中内存缓存
        const cached = this.entriesByName.get(candidate.name);
        if (cached && cached.skillPath === locator.path) {
            return cached.document.toDefinition(providerName);
        }
        // 若缓存未命中则重新从文件读取
        let doc;
        try {
            doc = await SkillDocument.fromFile(locator.path, options?.signal);
        }
        catch (err) {
            if (err?.name === 'AbortError')
                throw err;
            const code = err?.code;
            if (code === 'ENOENT')
                return undefined;
            options?.logger?.warn(`[SkillCatalog] get ${candidate.name}: read failed (${code ?? String(err)})`);
            return undefined;
        }
        if (doc.name !== candidate.name) {
            options?.logger?.warn(`[SkillCatalog] get ${candidate.name}: name drift "${doc.name}" != "${candidate.name}"`);
            return undefined;
        }
        return doc.toDefinition(providerName);
    }
    /**
     * 生成目录健康度与一致性完整体检报告（供 verify 脚本与 CI 质量门禁复用）。
     */
    verifyIntegrity() {
        const entries = Array.from(this.entriesByName.values());
        const ok = this.duplicates.length === 0 && this.loadErrors.length === 0 && entries.every((e) => !e.nameDrift);
        return {
            total: entries.length,
            entries,
            duplicates: [...this.duplicates],
            missingSkillMd: [...this.missingSkillMd],
            errors: [...this.loadErrors],
            ok,
        };
    }
}
//# sourceMappingURL=catalog.js.map