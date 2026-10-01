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
import type { SkillCandidate, SkillDefinition } from '@deepseek-ai/dsh-skill';
export interface SkillInvocationPolicy {
    modelInvocable: boolean;
    userInvocable: boolean;
}
export interface SkillDocumentData {
    name: string;
    description: string;
    whenToUse?: string;
    invocation: SkillInvocationPolicy;
    metadata?: Record<string, unknown>;
    extra: Record<string, unknown>;
}
export declare class SkillDocument {
    readonly path: string;
    readonly name: string;
    readonly description: string;
    readonly whenToUse?: string;
    readonly invocation: SkillInvocationPolicy;
    readonly metadata?: Record<string, unknown>;
    readonly body: string;
    readonly rawFrontmatterData: Record<string, unknown>;
    private constructor();
    /**
     * 从指定文件路径异步解析 SkillDocument。
     */
    static fromFile(filePath: string, signal?: AbortSignal): Promise<SkillDocument>;
    /**
     * 从内存中的原始 markdown 字符串直接解析（用于测试或动态构建）。
     */
    static fromString(raw: string, filePath?: string): SkillDocument;
    /**
     * 映射为 DSH SkillCandidate 契约对象。
     */
    toCandidate(providerName: string, rank: number): SkillCandidate;
    /**
     * 映射为 DSH SkillDefinition 契约对象。
     */
    toDefinition(providerName: string): SkillDefinition;
}
//# sourceMappingURL=document.d.ts.map