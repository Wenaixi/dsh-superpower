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
import type { SkillCandidate, SkillDefinition } from '@deepseek-ai/dsh-skill';
import { SkillDocument } from './document.js';
export interface CatalogLogger {
    warn(msg: string): void;
    debug?(msg: string): void;
    info?(msg: string): void;
}
export interface CatalogLookupOptions {
    signal?: AbortSignal;
    logger?: CatalogLogger;
}
export interface CatalogEntry {
    directoryName: string;
    skillPath: string;
    document: SkillDocument;
    nameDrift: boolean;
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
    readonly skillDir: string;
    private readonly entriesByName;
    private readonly entriesByDir;
    private readonly duplicates;
    private readonly missingSkillMd;
    private readonly loadErrors;
    constructor(skillDir: string);
    /**
     * 从指定目录异步扫描并构建 SkillCatalog 深度实例。
     */
    static fromDirectory(skillDir: string, options?: CatalogLookupOptions): Promise<SkillCatalog>;
    private scan;
    /**
     * 将当前目录下的所有有效技能映射为 DSH SkillCandidate 数组。
     */
    listCandidates(providerName: string, rank: number): readonly SkillCandidate[];
    /**
     * 根据候选技能的 locator 与名称解析出完整 SkillDefinition。
     * 优先命中内存缓存；若路径变动则重新读取文件并检查名称一致性。
     */
    getDefinition(candidate: SkillCandidate, providerName: string, options?: CatalogLookupOptions): Promise<SkillDefinition | undefined>;
    /**
     * 生成目录健康度与一致性完整体检报告（供 verify 脚本与 CI 质量门禁复用）。
     */
    verifyIntegrity(): CatalogIntegrityReport;
}
//# sourceMappingURL=catalog.d.ts.map