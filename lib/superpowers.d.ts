/**
 * @wenaixi/dsh-superpower — DSH 移植版 Superpowers
 *
 * 将 obra/superpowers 的 15 个 skill 以 DSH 原生 SkillProvider 形式暴露，
 * 通过 ctx.skills.registerProvider 注入全局层，rank 10 使本插件技能优先级最高：
 * 小于 dsh-skill-filesystem 的项目/用户根（100–500）与官方 bundled（600）。
 */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { SkillCatalog } from './catalog.js';
import { SkillDocument } from './document.js';
export { SkillCatalog, EXPECTED_SKILL_COUNT, type SpecificationReport } from './catalog.js';
export { SkillDocument, type SpecificationTestResult } from './document.js';
export { SkillSwitches, applySwitches, readSwitches } from './switches.js';
declare module '@deepseek-ai/cordis' {
    interface Events {
        /**
         * volatile 配置值已在不重挂载的情况下提交给运行中的 fiber；派发给所属 fiber。
         * @param paths - 变更的配置路径数组
         * @mode emit
         */
        'loader/volatile-update'(paths: readonly (readonly string[])[]): void;
    }
}
export declare const Config: Schema<Config>;
export interface Config {
    providerName: string;
    skillDir?: string;
    /** 技能正文与描述的显示语言偏好：'zh' 中文（默认）或 'en' 英文。 */
    language: Volatile<'zh' | 'en'>;
    /** 唯一的开关写入目标：键为技能名，值为 true 时模型与用户两侧同时关闭 */
    disabled: Volatile<Record<string, boolean>>;
    /** 已废弃的历史禁言表，面板不再写入，只在迁移批里被 unset 清空 */
    modelDisabled: Volatile<Record<string, boolean>>;
    /** 已废弃的历史禁言表，理由同 modelDisabled */
    userDisabled: Volatile<Record<string, boolean>>;
}
export declare const name = "superpowers";
export declare const inject: readonly ["skills"];
export declare function apply(ctx: Context, config: Config): void;
declare const _default: {
    name: string;
    inject: readonly ["skills"];
    Config: Schema<Config>;
    apply: typeof apply;
    SkillDocument: typeof SkillDocument;
    SkillCatalog: typeof SkillCatalog;
};
export default _default;
//# sourceMappingURL=superpowers.d.ts.map