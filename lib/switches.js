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
/**
 * 读取禁言字典，兼容 volatile 引用与普通对象两种形态。
 *
 * 合并规则：disabled 非空时只认它（用户已经在新表上操作过，旧值即过期）；
 * disabled 为空时取两张旧表的并集——任一侧曾被关闭的技能都算关闭，
 * 这与升级前的效果一致，不会让已关闭的技能重新冒出来。
 *
 * @param config - 插件配置容器，通常为 apply 收到的 config 对象
 * @returns 已解包并浅拷贝的禁言字典；字段缺失或类型不符时为空字典
 */
function readLanguage(config) {
    const source = (config ?? {});
    const raw = unwrapValue(source['language']);
    if (raw === 'en')
        return 'en';
    if (raw === 'zh')
        return 'zh';
    return undefined;
}
/** 解包单值 volatile 字段。 */
function unwrapValue(value) {
    return typeof value?.get === 'function' ? value.get() : value;
}
export function readSwitches(config) {
    const source = (config ?? {});
    const disabled = unwrapDictionary(source['disabled']);
    if (Object.keys(disabled).length > 0)
        return { disabled, language: readLanguage(config) };
    const legacy = {
        ...unwrapDictionary(source['modelDisabled']),
        ...unwrapDictionary(source['userDisabled']),
    };
    return { disabled: legacy, language: readLanguage(config) };
}
/**
 * 用禁言表覆盖一个技能条目的 invocation 策略，返回新对象且不修改入参。
 *
 * @param entry - SkillCandidate 或 SkillDefinition，二者都带 name 与 invocation
 * @param switches - 禁言字典
 * @returns 覆盖后的新条目；未被禁言的技能原样返回一份浅拷贝
 */
export function applySwitches(entry, switches) {
    if (switches.disabled[entry.name] !== true)
        return { ...entry };
    return {
        ...entry,
        invocation: { modelInvocable: false, userInvocable: false },
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
     * 执行五条边界契约断言。
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
        await run('禁用时两侧同时关闭且入参不变', () => {
            const original = entry();
            const out = applySwitches(original, { disabled: { 'switch-test': true }, language: 'zh' });
            if (out.invocation.modelInvocable !== false)
                throw new Error('modelInvocable 未被关闭');
            if (out.invocation.userInvocable !== false)
                throw new Error('userInvocable 未被关闭');
            if (original.invocation.modelInvocable !== true)
                throw new Error('入参被就地修改');
        });
        await run('字典缺项视为启用', () => {
            const out = applySwitches(entry(), { disabled: {}, language: 'zh' });
            if (!out.invocation.modelInvocable || !out.invocation.userInvocable) {
                throw new Error('缺项被误判为禁用');
            }
        });
        await run('无关技能名不影响他人', () => {
            const out = applySwitches(entry(), { disabled: { 'other-skill': true }, language: 'zh' });
            if (!out.invocation.modelInvocable)
                throw new Error('无关键误伤了本技能');
        });
        await run('新表非空时忽略旧表', () => {
            const out = readSwitches({
                disabled: { 'switch-test': true },
                modelDisabled: { other: true },
                userDisabled: { 'third': true },
            });
            if (Object.keys(out.disabled).length !== 1 || out.disabled['switch-test'] !== true) {
                throw new Error('disabled 非空却仍读到了旧表的键');
            }
        });
        await run('默认语言为 undefined（跟随宿主）', () => {
            const out = readSwitches({});
            if (out.language !== undefined)
                throw new Error('默认语言应为 undefined: ' + out.language);
        });
        await run('language=en 时正确返回', () => {
            const out = readSwitches({ language: 'en' });
            if (out.language !== 'en')
                throw new Error('language 未读取为 en');
        });
        await run('language 不影响禁言表', () => {
            const out = readSwitches({ language: 'en', disabled: { a: true } });
            if (Object.keys(out.disabled).length !== 1)
                throw new Error('language 读取影响禁言表');
        });
        await run('新表为空时并入两张旧表', () => {
            const out = readSwitches({
                disabled: {},
                modelDisabled: { a: true },
                userDisabled: { b: true, c: true },
            });
            const keys = Object.keys(out.disabled).sort();
            if (keys.length !== 3 || keys.join(',') !== 'a,b,c') {
                throw new Error('旧表并集不完整，实际 ' + keys.join(','));
            }
        });
        return results;
    },
};
//# sourceMappingURL=switches.js.map