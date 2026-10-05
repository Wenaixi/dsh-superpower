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
import type { SkillCandidate, SkillDefinition } from '@deepseek-ai/dsh-skill';
import { SkillDocument, type SpecificationTestResult } from './document.js';
export interface CatalogLogger {
    warn(msg: string): void;
    debug?(msg: string): void;
    info?(msg: string): void;
}
export interface CatalogLookupOptions {
    signal?: AbortSignal;
    logger?: CatalogLogger;
    forceScan?: boolean;
}
export interface CatalogEntry {
    directoryName: string;
    skillPath: string;
    document: SkillDocument;
    enDocument?: SkillDocument;
    nameDrift: boolean;
}
export interface SpecificationReport {
    total: number;
    passed: number;
    failed: number;
    results: SpecificationTestResult[];
    ok: boolean;
}
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
export declare const EXPECTED_SKILL_COUNT = 15;
export interface CatalogFingerprint {
    dirMtimeMs: number;
    skillDirs: string[];
    skillMdMtimes: [string, number | null][];
    /** 各技能目录下 SKILL.en.md 的 mtime（缺失记 null）：英文版正文编辑对中文文件不可见。 */
    skillMdEnMtimes: [string, number | null][];
}
export interface CatalogIntegrityReport {
    total: number;
    entries: CatalogEntry[];
    duplicates: string[];
    missingSkillMd: string[];
    errors: {
        path: string;
        error: string;
    }[];
    ok: boolean;
}
export declare class SkillCatalog {
    #private;
    readonly skillDir: string;
    private readonly entriesByName;
    private readonly entriesByDir;
    private readonly duplicates;
    private readonly missingSkillMd;
    private readonly loadErrors;
    private cachedCandidates;
    private fingerprint;
    private lastScanProviderName?;
    private lastScanRank?;
    private lastScanLanguage?;
    constructor(skillDir: string);
    /**
     * 从指定目录异步扫描并构建已预热的 SkillCatalog 深度实例。
     */
    static fromDirectory(skillDir: string, options?: CatalogLookupOptions): Promise<SkillCatalog>;
    /**
     * 清空快照与索引，强制下一轮查询重新从磁盘装载。
     */
    invalidate(): void;
    /**
     * 探测目录是否发生变动：与 scan 记录的指纹逐键比对。
     *
     * 稳定场景只做 1 次根 stat + 1 次 readdir；仅当前两键都相同时才逐目录 stat SKILL.md。
     * 不读任何文件内容，保留「未变动时零重复读盘」的初衷。
     */
    private isDirModified;
    /**
     * 执行全量目录遍历与技能索引构建。
     */
    scan(options?: CatalogLookupOptions): Promise<void>;
    /**
     * 映射当前有效技能为 DSH SkillCandidate 快照。
     * 自动按 mtime 评估有效性，未变动时直接复用不可变快照，零重复读盘。
     */
    listCandidates(providerName: string, rank: number, options?: CatalogLookupOptions & {
        language?: 'zh' | 'en';
    }): Promise<readonly SkillCandidate[]>;
    /**
     * 根据候选技能的 locator 与名称解析出完整 SkillDefinition。
     * 优先命中内存缓存；若发生热重读，自动自愈更新回内存映射，消除状态撕裂缝隙。
     */
    getDefinition(candidate: SkillCandidate, providerName: string, options?: CatalogLookupOptions & {
        language?: 'zh' | 'en';
    }): Promise<SkillDefinition | undefined>;
    /**
     * 执行 SkillCatalog 自身边界契约自检（排重与漂移探测）。
     */
    static selfTest(): Promise<SpecificationTestResult[]>;
    /**
     * 执行完整的核心规范测试套件，返回聚合体检报告（测试表面即接口）。
     */
    static verifySpecification(): Promise<SpecificationReport>;
    /**
     * 生成目录健康度与一致性完整体检报告（供 verify 脚本与 CI 质量门禁复用）。
     */
    verifyIntegrity(): CatalogIntegrityReport;
}
//# sourceMappingURL=catalog.d.ts.map