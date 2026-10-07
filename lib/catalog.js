/**
 * @wenaixi/dsh-superpower — SkillCatalog 深度模块
 *
 * 封装技能目录的发现、遍历、健康探测、排重、名称漂移校验与版本化快照索引。
 *
 * 核心设计：
 * - Depth: 将文件系统遍历、mtime 存活检测、去重、状态回写与快照复用隐藏在极简接口之后；
 * - Locality: 集中管理技能目录发现逻辑、缓存一致性与规范合规规则；
 * - Leverage: 同时支撑 SuperpowersProvider 高性能运行时与 verify.mjs 质检治理。
 */
import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SkillDocument } from './document.js';
import { SkillSwitches } from './switches.js';
/**
 * 目录变更指纹：scan 结束时一次性原子写入的三键聚合。
 *
 * 三键各自覆盖一类变更，缺一即产生「静默返回过期目录」的窗口：
 * - dirMtimeMs：技能根目录自身的 mtime，覆盖根级条目的增删与直接子文件改写；
 * - skillDirs：根级技能目录名集合，覆盖「先建目录、稍后才写 SKILL.md」的增量场景
 *   （该场景不改根目录 mtime，历史上完全不可见）；
 * - skillMdMtimes：每个技能目录下 SKILL.md 的 mtime（缺失记 null），覆盖正文编辑、
 *   SKILL.md 删除与延迟创建——SKILL.md 位于子层，其任何变更对根目录 mtime 不可见。
 */
/**
 * 本包默认打包的技能数量：verify.mjs 与 check-skill-switches.mjs 的断言唯一事实源。
 * 新增/删除技能时必须同步修改此值，其余消费点一律经引用取用，禁止散落魔法数。
 */
export const EXPECTED_SKILL_COUNT = 15;
export class SkillCatalog {
    skillDir;
    entriesByName = new Map();
    entriesByDir = new Map();
    duplicates = [];
    missingSkillMd = [];
    loadErrors = [];
    // 快照缓存与版本探测状态
    cachedCandidates = null;
    fingerprint = null;
    lastScanProviderName;
    lastScanRank;
    lastScanLanguage;
    constructor(skillDir) {
        this.skillDir = skillDir;
    }
    /**
     * 从指定目录异步扫描并构建已预热的 SkillCatalog 深度实例。
     */
    static async fromDirectory(skillDir, options) {
        options?.signal?.throwIfAborted();
        const catalog = new SkillCatalog(skillDir);
        await catalog.scan(options);
        return catalog;
    }
    /**
     * 清空快照与索引，强制下一轮查询重新从磁盘装载。
     */
    invalidate() {
        this.cachedCandidates = null;
        this.fingerprint = null;
        this.lastScanProviderName = undefined;
        this.lastScanRank = undefined;
        this.lastScanLanguage = undefined;
        this.entriesByName.clear();
        this.entriesByDir.clear();
        this.duplicates.length = 0;
        this.missingSkillMd.length = 0;
        this.loadErrors.length = 0;
    }
    /**
     * 探测目录是否发生变动：与 scan 记录的指纹逐键比对。
     *
     * 稳定场景只做 1 次根 stat + 1 次 readdir；仅当前两键都相同时才逐目录 stat SKILL.md。
     * 不读任何文件内容，保留「未变动时零重复读盘」的初衷。
     */
    async isDirModified(signal) {
        const previous = this.fingerprint;
        if (previous === null)
            return true;
        try {
            signal?.throwIfAborted();
            const dirStat = await stat(this.skillDir);
            if (dirStat.mtimeMs !== previous.dirMtimeMs)
                return true;
            const dirents = await readdir(this.skillDir, { withFileTypes: true, signal });
            const dirs = dirents
                .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
                .map((e) => e.name)
                .sort((a, b) => a.localeCompare(b));
            if (dirs.length !== previous.skillDirs.length || dirs.some((name, i) => name !== previous.skillDirs[i]))
                return true;
            for (const [name, mtimeMs] of previous.skillMdMtimes) {
                signal?.throwIfAborted();
                const current = await this.#mtimeOrNull(join(this.skillDir, name, 'SKILL.md'));
                if (current !== mtimeMs)
                    return true;
            }
            return false;
        }
        catch (err) {
            if (signal?.aborted || err?.name === 'AbortError')
                throw err;
            return true;
        }
    }
    /** stat 一次文件的 mtime；文件缺失或不可读返回 null（缺失本身也是状态的一部分）。 */
    async #mtimeOrNull(path) {
        try {
            return (await stat(path)).mtimeMs;
        }
        catch {
            return null;
        }
    }
    /**
     * 执行全量目录遍历与技能索引构建。
     */
    async scan(options) {
        const signal = options?.signal;
        const logger = options?.logger;
        let dirStat;
        try {
            dirStat = await stat(this.skillDir);
        }
        catch (err) {
            const code = err?.code;
            if (code === 'ENOENT' || code === 'ENOTDIR') {
                logger?.warn(`[SkillCatalog] skillDir not found: ${this.skillDir}`);
                this.invalidate();
                return;
            }
            throw err;
        }
        let dirents;
        try {
            dirents = await readdir(this.skillDir, { withFileTypes: true, signal });
        }
        catch (err) {
            const code = err?.code;
            if (code === 'ENOENT' || code === 'ENOTDIR') {
                logger?.warn(`[SkillCatalog] skillDir not found: ${this.skillDir}`);
                this.invalidate();
                return;
            }
            throw err;
        }
        // 重置内存临时状态
        this.entriesByName.clear();
        this.entriesByDir.clear();
        this.duplicates.length = 0;
        this.missingSkillMd.length = 0;
        this.loadErrors.length = 0;
        this.cachedCandidates = null;
        const sorted = dirents.filter((e) => e.isDirectory() && !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name));
        // SKILL.md 的 mtime 在下面的 stat 中本就要取，顺手留作指纹，不增加任何 I/O
        const skillMdMtimes = new Map();
        for (const entry of sorted) {
            signal?.throwIfAborted();
            const skillPath = join(this.skillDir, entry.name, 'SKILL.md');
            try {
                skillMdMtimes.set(entry.name, (await stat(skillPath)).mtimeMs);
            }
            catch (err) {
                skillMdMtimes.set(entry.name, null);
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
        // 指纹在 scan 末尾一次性写入：中途 abort 抛出即不写，状态仍为上一轮的完整指纹，
        // 下一轮 listCandidates 因 cachedCandidates === null 短路全量重扫自愈。
        this.fingerprint = {
            dirMtimeMs: dirStat.mtimeMs,
            skillDirs: sorted.map((e) => e.name),
            skillMdMtimes: sorted.map((e) => [e.name, skillMdMtimes.get(e.name) ?? null]),
        };
    }
    /**
     * 映射当前有效技能为 DSH SkillCandidate 快照。
     * 自动按 mtime 评估有效性，未变动时直接复用不可变快照，零重复读盘。
     */
    async listCandidates(providerName, rank, options) {
        options?.signal?.throwIfAborted();
        const language = options?.language === 'en' ? 'en' : 'zh';
        const needsRebuild = this.lastScanLanguage !== language;
        const needsScan = options?.forceScan ||
            this.cachedCandidates === null ||
            needsRebuild ||
            this.lastScanProviderName !== providerName ||
            this.lastScanRank !== rank ||
            (await this.isDirModified(options?.signal));
        if (needsScan) {
            await this.scan(options);
            const list = [];
            for (const entry of this.entriesByName.values()) {
                list.push(entry.document.toCandidate(providerName, rank, language));
            }
            this.cachedCandidates = Object.freeze(list);
            this.lastScanProviderName = providerName;
            this.lastScanRank = rank;
            this.lastScanLanguage = language;
        }
        return this.cachedCandidates;
    }
    /**
     * 根据候选技能的 locator 与名称解析出完整 SkillDefinition。
     * 优先命中内存缓存；若发生热重读，自动自愈更新回内存映射，消除状态撕裂缝隙。
     */
    async getDefinition(candidate, providerName, options) {
        options?.signal?.throwIfAborted();
        const language = options?.language === 'en' ? 'en' : 'zh';
        const locator = candidate.locator;
        if (!locator?.path)
            return undefined;
        // 优先命中内存缓存
        const cached = this.entriesByName.get(candidate.name);
        if (cached && cached.skillPath === locator.path) {
            return cached.document.toDefinition(providerName, language);
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
        // 自愈回写：将重新读取解析出的文档更新进内部索引，保持状态严格一致
        const dirName = cached?.directoryName ?? candidate.name;
        const updatedEntry = {
            directoryName: dirName,
            skillPath: locator.path,
            document: doc,
            nameDrift: doc.name !== dirName,
        };
        this.entriesByName.set(doc.name, updatedEntry);
        this.entriesByDir.set(dirName, updatedEntry);
        this.cachedCandidates = null; // 快照失效，以便下一轮刷新
        return doc.toDefinition(providerName, language);
    }
    /**
     * 执行 SkillCatalog 自身边界契约自检（排重与漂移探测）。
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
        await runCheck('目录排重', async () => {
            const base = await mkdtemp(join(tmpdir(), 'sp-dup-'));
            try {
                const md = '---\nname: same-name\ndescription: d\n---\nbody';
                await mkdir(join(base, 'alpha'));
                await mkdir(join(base, 'bravo'));
                await Promise.all([writeFile(join(base, 'alpha', 'SKILL.md'), md), writeFile(join(base, 'bravo', 'SKILL.md'), md)]);
                const cat = await SkillCatalog.fromDirectory(base);
                if (cat.verifyIntegrity().duplicates.length !== 1)
                    throw new Error('duplicates != 1');
            }
            finally {
                await rm(base, { recursive: true, force: true }).catch(() => { });
            }
        });
        await runCheck('name drift', async () => {
            const base = await mkdtemp(join(tmpdir(), 'sp-drift-'));
            try {
                await mkdir(join(base, 'dir-name'));
                await writeFile(join(base, 'dir-name', 'SKILL.md'), '---\nname: other-name\ndescription: d\n---\nbody');
                const cat = await SkillCatalog.fromDirectory(base);
                if (!cat.verifyIntegrity().entries[0]?.nameDrift)
                    throw new Error('nameDrift 未生效');
            }
            finally {
                await rm(base, { recursive: true, force: true }).catch(() => { });
            }
        });
        await runCheck('正文编辑触发重扫', async () => {
            const base = await mkdtemp(join(tmpdir(), 'sp-mtime-'));
            try {
                await mkdir(join(base, 'demo'));
                await writeFile(join(base, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: v1\n---\nbody');
                const cat = await SkillCatalog.fromDirectory(base);
                const first = await cat.listCandidates('probe', 10);
                if (first[0]?.description !== 'v1')
                    throw new Error('初始描述不对: ' + first[0]?.description);
                // 规避 NTFS 毫秒级时间分辨率，确保 SKILL.md mtime 出现差异
                await new Promise((r) => setTimeout(r, 25));
                await writeFile(join(base, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: v2\n---\nbody-v2');
                const second = await cat.listCandidates('probe', 10);
                if (second[0]?.description !== 'v2')
                    throw new Error('编辑正文未触发重扫: 仍为 ' + second[0]?.description);
                // list 与 getDefinition 必须同源：热重读自愈不能替私有指纹兜底
                const def = await cat.getDefinition(second[0], 'probe');
                if (!def || !def.content.includes('body-v2'))
                    throw new Error('getDefinition 与 list 不同源');
            }
            finally {
                await rm(base, { recursive: true, force: true }).catch(() => { });
            }
        });
        await runCheck('增量新建技能可见', async () => {
            const base = await mkdtemp(join(tmpdir(), 'sp-incr-'));
            try {
                await mkdir(join(base, 'alpha'));
                await writeFile(join(base, 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: a\n---\nbody');
                const cat = await SkillCatalog.fromDirectory(base);
                // 先建目录后写 SKILL.md：纯目录 mtime 判据对此完全不可见（修复前稳定失败）
                await mkdir(join(base, 'inc'));
                const afterMkdir = await cat.listCandidates('probe', 10);
                if (afterMkdir.some((x) => x.name === 'inc'))
                    throw new Error('空目录不应出现在清单');
                await writeFile(join(base, 'inc', 'SKILL.md'), '---\nname: inc\ndescription: i\n---\nbody');
                const afterWrite = await cat.listCandidates('probe', 10);
                if (!afterWrite.some((x) => x.name === 'inc'))
                    throw new Error('增量新建未触发重扫');
            }
            finally {
                await rm(base, { recursive: true, force: true }).catch(() => { });
            }
        });
        await runCheck('删除技能目录后移除', async () => {
            const base = await mkdtemp(join(tmpdir(), 'sp-rm-'));
            try {
                await mkdir(join(base, 'alpha'));
                await writeFile(join(base, 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: a\n---\nbody');
                const cat = await SkillCatalog.fromDirectory(base);
                await rm(join(base, 'alpha'), { recursive: true, force: true });
                const after = await cat.listCandidates('probe', 10);
                if (after.some((x) => x.name === 'alpha'))
                    throw new Error('删除目录未生效');
            }
            finally {
                await rm(base, { recursive: true, force: true }).catch(() => { });
            }
        });
        await runCheck('双语描述按语言取词且正文恒英文', async () => {
            const base = await mkdtemp(join(tmpdir(), 'sp-bi-'));
            try {
                await mkdir(join(base, 'demo'));
                await writeFile(join(base, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: "Superpower Skill: English description"\ndescription_zh: 中文描述\n---\nEnglish body');
                const catalog = await SkillCatalog.fromDirectory(base);
                const zh = await catalog.listCandidates('probe', 10);
                if (zh[0]?.description !== '中文描述')
                    throw new Error('默认 zh 描述不对: ' + zh[0]?.description);
                const en = await catalog.listCandidates('probe', 10, { language: 'en' });
                if (!en[0]?.description.startsWith('Superpower Skill: '))
                    throw new Error('en 描述未命中: ' + en[0]?.description);
                const def = await catalog.getDefinition(en[0], 'probe', { language: 'en' });
                if (!def?.content.includes('English body'))
                    throw new Error('正文未命中: ' + def?.content);
                if (def?.description !== 'Superpower Skill: English description')
                    throw new Error('getDefinition en 描述不对');
                const back = await catalog.getDefinition(en[0], 'probe', { language: 'zh' });
                if (back?.description !== '中文描述')
                    throw new Error('getDefinition zh 描述不对');
            }
            finally {
                await rm(base, { recursive: true, force: true }).catch(() => { });
            }
        });
        await runCheck('描述变更触发重扫', async () => {
            const base = await mkdtemp(join(tmpdir(), 'sp-bi2-'));
            try {
                await mkdir(join(base, 'demo'));
                await writeFile(join(base, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: en-v1\ndescription_zh: zh-v1\n---\nbody');
                const catalog = await SkillCatalog.fromDirectory(base);
                const first = await catalog.listCandidates('probe', 10, { language: 'zh' });
                if (first[0]?.description !== 'zh-v1')
                    throw new Error('zh 初值不对: ' + first[0]?.description);
                await new Promise((r) => setTimeout(r, 25));
                await writeFile(join(base, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: en-v2\ndescription_zh: zh-v2\n---\nbody');
                const second = await catalog.listCandidates('probe', 10, { language: 'zh' });
                if (second[0]?.description !== 'zh-v2')
                    throw new Error('描述编辑未触发重扫: ' + second[0]?.description);
            }
            finally {
                await rm(base, { recursive: true, force: true }).catch(() => { });
            }
        });
        await runCheck('verifyIntegrity.ok 计入缺失 SKILL.md', async () => {
            const base = await mkdtemp(join(tmpdir(), 'sp-ok-'));
            try {
                await mkdir(join(base, 'empty-dir'));
                const cat = await SkillCatalog.fromDirectory(base);
                if (cat.verifyIntegrity().ok !== false)
                    throw new Error('ok 未计入 missingSkillMd');
                if (cat.verifyIntegrity().missingSkillMd.length !== 1)
                    throw new Error('missingSkillMd 收集数量不对');
            }
            finally {
                await rm(base, { recursive: true, force: true }).catch(() => { });
            }
        });
        return results;
    }
    /**
     * 执行完整的核心规范测试套件，返回聚合体检报告（测试表面即接口）。
     */
    static async verifySpecification() {
        const [docResults, catResults, switchResults] = await Promise.all([
            SkillDocument.selfTest(),
            SkillCatalog.selfTest(),
            SkillSwitches.selfTest(),
        ]);
        const results = [...docResults, ...catResults, ...switchResults];
        const passed = results.filter((r) => r.ok).length;
        const failed = results.length - passed;
        return {
            total: results.length,
            passed,
            failed,
            results,
            ok: failed === 0,
        };
    }
    /**
     * 生成目录健康度与一致性完整体检报告（供 verify 脚本与 CI 质量门禁复用）。
     */
    verifyIntegrity() {
        const entries = Array.from(this.entriesByName.values());
        // 三处失败源与 verify.mjs 的判定保持一致：目录在而 SKILL.md 缺失同样是失败，
        // 漏掉它会让 ok 变成「看着健康实则缺件」的死字段。
        const ok = this.duplicates.length === 0 &&
            this.missingSkillMd.length === 0 &&
            this.loadErrors.length === 0 &&
            entries.every((e) => !e.nameDrift);
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