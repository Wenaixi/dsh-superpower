/**
 * dsh-superpower — DSH 移植版 Superpowers
 *
 * 将 obra/superpowers 的 14 个 skill 以 DSH 原生 SkillProvider 形式暴露，
 * 通过 ctx.skills.registerProvider 注入全局层，rank 550 使 project 级 skill 可覆盖。
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export declare const Config: Schema<Schemastery.ObjectS<{
    /** 注册到 ctx.skills 的 provider 名称，默认为 superpowers；不可为保留名 runtime */
    providerName: Schema<string, string>;
    /** skill 目录绝对路径，默认取包内 skills/；便于本地调试指向其他目录 */
    skillDir: Schema<string, string>;
}>, Schemastery.ObjectT<{
    /** 注册到 ctx.skills 的 provider 名称，默认为 superpowers；不可为保留名 runtime */
    providerName: Schema<string, string>;
    /** skill 目录绝对路径，默认取包内 skills/；便于本地调试指向其他目录 */
    skillDir: Schema<string, string>;
}>>;
export interface Config {
    providerName: string;
    skillDir?: string;
}
export declare const name = "superpowers";
export declare const inject: readonly ["skills"];
export declare function apply(ctx: Context, config: Config): void;
declare const _default: {
    name: string;
    inject: readonly ["skills"];
    Config: Schema<Schemastery.ObjectS<{
        /** 注册到 ctx.skills 的 provider 名称，默认为 superpowers；不可为保留名 runtime */
        providerName: Schema<string, string>;
        /** skill 目录绝对路径，默认取包内 skills/；便于本地调试指向其他目录 */
        skillDir: Schema<string, string>;
    }>, Schemastery.ObjectT<{
        /** 注册到 ctx.skills 的 provider 名称，默认为 superpowers；不可为保留名 runtime */
        providerName: Schema<string, string>;
        /** skill 目录绝对路径，默认取包内 skills/；便于本地调试指向其他目录 */
        skillDir: Schema<string, string>;
    }>>;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=superpowers.d.ts.map