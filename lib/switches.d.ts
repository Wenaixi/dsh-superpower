/**
 * @wenaixi/dsh-superpower — 技能开关状态深度模块
 *
 * 封装「哪个技能对哪一侧可见」的唯一判据：两个以技能名为键的禁言字典。
 *
 * 核心设计：
 * - Depth: 把 volatile 引用解包与 invocation 覆盖隐藏在两个纯函数之后；
 * - Locality: 所有开关语义内聚于此，Provider 只负责调用；
 * - Test Surface: selfTest() 是接口即测试表面，随 verifySpecification 一并进门禁。
 *
 * DSH 的 SkillInvocationPolicy 只有 modelInvocable 与 userInvocable 两个布尔，
 * 这是平台唯一的官方屏蔽通道：模型目录由 dsh-tool-skill 按 isModelInvocable 过滤，
 * skill 工具加载时二次校验；userInvocable 为 false 时斜杠命令与 CLI 清单都不再列出。
 * 两种组合都保留技能在注册表中的存在与同名裁决权，与在 SKILL.md 写
 * disable-model-invocation / user-invocable 完全等价。
 */
import type { SkillInvocationPolicy } from '@deepseek-ai/dsh-skill';
/** 以技能名为键的禁言表：键存在且值为 true 表示该技能在该侧被关闭。 */
export interface SkillSwitches {
    /** 关闭模型自动触发的技能名集合（映射为 modelInvocable = false）。 */
    modelDisabled: Record<string, boolean>;
    /** 关闭用户 /name 显式调用的技能名集合（映射为 userInvocable = false）。 */
    userDisabled: Record<string, boolean>;
}
/**
 * 从任意配置容器读取两个禁言字典，兼容 volatile 引用与普通对象两种形态。
 *
 * @param config - 插件配置容器，通常为 apply 收到的 config 对象
 * @returns 两个已解包并浅拷贝的普通禁言字典；字段缺失或类型不符时为空字典
 */
export declare function readSwitches(config: unknown): SkillSwitches;
/**
 * 用禁言表覆盖一个技能条目的 invocation 策略，返回新对象且不修改入参。
 *
 * @param entry - SkillCandidate 或 SkillDefinition，二者都带 name 与 invocation
 * @param switches - 两个禁言字典
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
     * 执行三条边界契约断言。
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