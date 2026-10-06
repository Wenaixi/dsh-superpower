/**
 * @wenaixi/dsh-superpower — 技能开关状态深度模块
 *
 * 封装「哪个技能被关闭」的唯一判据：一张以技能名为键的禁言字典。
 *
 * 核心设计：
 * - Depth: 把 volatile 引用解包与 invocation 覆盖隐藏在两个纯函数之后；
 * - Locality: 所有开关语义内聚于此，Provider 只负责调用；
 * - Test Surface: selfTest() 是接口即测试表面，随 verifySpecification 一并进门禁。
 *
 * 关闭一个技能会让 DSH 的 SkillInvocationPolicy 两个布尔同时为 false：
 * modelInvocable 为 false 时模型目录不再列出该技能且 skill 工具调用被拒；
 * userInvocable 为 false 时斜杠命令补全与 CLI 清单都不再列出。
 * 技能仍保留在注册表中的存在与同名裁决权，与在 SKILL.md 写
 * disable-model-invocation / user-invocable 完全等价。
 *
 * 历史兼容：v7.3.0 及之前分列 modelDisabled 与 userDisabled 两张表，v7.4.0 起
 * 统一为 disabled。旧字段仍在 schema 里声明，所以旧 profile 的值能被解析；
 * disabled 为空时取两旧字段的并集，让升级前的开关在用户下一次操作前继续生效。
 * 用户一旦在面板做任何一次写入，那两个旧字段就被 unset，此后只剩 disabled。
 */
import type { SkillInvocationPolicy } from '@deepseek-ai/dsh-skill';
/** 以技能名为键的禁言表：键存在且值为 true 表示该技能被关闭。 */
export interface SkillSwitches {
    /** 关闭的技能名集合，映射为 modelInvocable = userInvocable = false。 */
    disabled: Record<string, boolean>;
    /** 技能描述显示语言偏好：'zh'/'en' 显式固定；undefined 表示跟随宿主界面语言。 */
    language: 'zh' | 'en' | undefined;
}
export declare function readSwitches(config: unknown): SkillSwitches;
/**
 * 用禁言表覆盖一个技能条目的 invocation 策略，返回新对象且不修改入参。
 *
 * @param entry - SkillCandidate 或 SkillDefinition，二者都带 name 与 invocation
 * @param switches - 禁言字典
 * @returns 覆盖后的新条目；未被禁言的技能原样返回一份浅拷贝
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
     * 执行五条边界契约断言。
     *
     * @returns 每条用例的成败与失败原因
     */
    selfTest(): Promise<{
        name: string;
        ok: boolean;
        error?: string;
    }[]>;
};
//# sourceMappingURL=switches.d.ts.map