/**
 * @wenaixi/dsh-superpower — 技能开关状态深度模块 (含容灾自愈提取引擎)
 *
 * 封装「哪个技能被关闭」的唯一判据：一张以技能名为键的禁言字典。
 *
 * 核心设计：
 * - Depth: 把 volatile 引用解包、Invocation 覆盖、容灾提取与脏数据自愈彻底封装在门后；
 * - Locality: 所有开关语义与配置容错自愈逻辑内聚于此，Provider 与客户端共用；
 * - Test Surface: selfTest() 是接口即测试表面，随 verifySpecification 一并进门禁。
 *
 * 容灾自愈保证：
 * 无论外部输入遭遇何种程度的破坏（非对象、字符串布尔值、脏区域码、原型污染、未知键残留），
 * 本模块均能安全从中抢救提取有效用户意图，绝不抛出异常崩溃。
 */
import type { SkillInvocationPolicy } from '@deepseek-ai/dsh-skill';
/** 本包所管理的 15 个标准技能名白名单集合。 */
export declare const KNOWN_SKILLS: Set<string>;
/** 以技能名为键的禁言表：键存在且值为 true 表示该技能被关闭。 */
export interface SkillSwitches {
    /** 关闭的技能名集合，映射为 modelInvocable = userInvocable = false。 */
    disabled: Record<string, boolean>;
    /** 技能描述显示语言偏好：'zh'/'en' 显式固定；undefined 表示跟随宿主界面语言。 */
    language: 'zh' | 'en' | undefined;
}
/** 容灾提取结果与自愈判定结果。 */
export interface CleanSwitchesExtraction {
    switches: SkillSwitches;
    isCorrupted: boolean;
}
/**
 * 容灾提取并归一化语言偏好设置。
 * 支持从非标语言码（如 'zh-CN', 'zh_CN', 'en-US', 'chinese' 等）中提取标准三态 ('zh' | 'en' | undefined)。
 */
export declare function extractCleanLanguage(value: unknown): 'zh' | 'en' | undefined;
/**
 * 容灾清洗并提取禁言字典。
 * 1. 过滤原型污染（__proto__, constructor）与未知非法键；
 * 2. 宽容识别非标真值（true, "true", 1, "1", "yes", "on", "disabled"）；
 * 3. 忽略假值（false, "false", 0, "no", "off" 等）。
 */
export declare function extractCleanDisabled(value: unknown): Record<string, boolean>;
/**
 * 纯函数探测配置是否包含损坏数据、非标格式或需要自愈修复的结构。
 */
export declare function isConfigCorrupted(config: unknown): boolean;
/**
 * 容灾提取完整技能开关与语言偏好。
 * 兼容 volatile 引用、普通对象、新旧表回退以及脏数据自愈清洗。
 */
export declare function extractCleanSwitches(config: unknown): SkillSwitches;
/**
 * 读取禁言字典与语言偏好（委托容灾自愈提取引擎）。
 */
export declare function readSwitches(config: unknown): SkillSwitches;
/**
 * 用禁言表覆盖一个技能条目的 invocation 策略，返回新对象且不修改入参。
 */
export declare function applySwitches<T extends {
    name: string;
    invocation: SkillInvocationPolicy;
}>(entry: T, switches: SkillSwitches): T;
/**
 * 开关语义自检：随 SkillCatalog.verifySpecification 一并进入质量门禁。
 */
export declare const SkillSwitches: {
    /**
     * 执行边界契约与容灾自愈断言。
     */
    selfTest(): Promise<{
        name: string;
        ok: boolean;
        error?: string;
    }[]>;
};
//# sourceMappingURL=switches.d.ts.map