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
/**
 * 从任意配置容器读取两个禁言字典，兼容 volatile 引用与普通对象两种形态。
 *
 * @param config - 插件配置容器，通常为 apply 收到的 config 对象
 * @returns 两个已解包并浅拷贝的普通禁言字典；字段缺失或类型不符时为空字典
 */
export function readSwitches(config) {
    const source = (config ?? {});
    return {
        modelDisabled: unwrapDictionary(source['modelDisabled']),
        userDisabled: unwrapDictionary(source['userDisabled']),
    };
}
/**
 * 用禁言表覆盖一个技能条目的 invocation 策略，返回新对象且不修改入参。
 *
 * @param entry - SkillCandidate 或 SkillDefinition，二者都带 name 与 invocation
 * @param switches - 两个禁言字典
 * @returns 覆盖后的新条目；未被禁言的技能原样返回一份浅拷贝
 */
export function applySwitches(entry, switches) {
    const modelBlocked = switches.modelDisabled[entry.name] === true;
    const userBlocked = switches.userDisabled[entry.name] === true;
    if (!modelBlocked && !userBlocked)
        return { ...entry };
    return {
        ...entry,
        invocation: {
            modelInvocable: entry.invocation.modelInvocable && !modelBlocked,
            userInvocable: entry.invocation.userInvocable && !userBlocked,
        },
    };
}
/**
 * 解包一个可能是 volatile 引用、可能是普通对象的字典字段。
 *
 * @param value - 字段原始值
 * @returns 普通对象字典；非对象或缺省时为空字典
 */
function unwrapDictionary(value) {
    const unwrapped = typeof value?.get === 'function'
        ? value.get()
        : value;
    if (typeof unwrapped !== 'object' || unwrapped === null || Array.isArray(unwrapped))
        return {};
    return { ...unwrapped };
}
/**
 * 开关语义自检：随 SkillCatalog.verifySpecification 一并进入质量门禁。
 */
export const SkillSwitches = {
    /**
     * 执行三条边界契约断言。
     *
     * @returns 每条用例的成败与失败原因
     */
    async selfTest() {
        const results = [];
        const run = async (name, fn) => {
            try {
                await fn();
                results.push({ name, ok: true });
            }
            catch (err) {
                results.push({ name, ok: false, error: err?.message ?? String(err) });
            }
        };
        const entry = () => ({
            name: 'switch-test',
            invocation: { modelInvocable: true, userInvocable: true },
        });
        await run('模型禁用且入参不变', () => {
            const original = entry();
            const out = applySwitches(original, {
                modelDisabled: { 'switch-test': true },
                userDisabled: {},
            });
            if (out.invocation.modelInvocable !== false)
                throw new Error('modelInvocable 未被关闭');
            if (out.invocation.userInvocable !== true)
                throw new Error('userInvocable 被误伤');
            if (original.invocation.modelInvocable !== true)
                throw new Error('入参被就地修改');
        });
        await run('字典缺项视为启用', () => {
            const out = applySwitches(entry(), { modelDisabled: {}, userDisabled: {} });
            if (!out.invocation.modelInvocable || !out.invocation.userInvocable) {
                throw new Error('缺项被误判为禁用');
            }
        });
        await run('无关技能名不影响他人', () => {
            const out = applySwitches(entry(), {
                modelDisabled: { 'other-skill': true },
                userDisabled: {},
            });
            if (!out.invocation.modelInvocable)
                throw new Error('无关键误伤了本技能');
        });
        return results;
    },
};
//# sourceMappingURL=switches.js.map