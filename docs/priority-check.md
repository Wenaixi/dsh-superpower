# 上位技能优先级自检

本目录用于实证验证「superpower 技能优先级最高」。当您的 DSH 宿主环境中同时存在本项目提供的 superpower 技能与任意其他来源的同名技能时，superpower 技能应当胜出、唯一生效。

验证步骤：

1. 安装并启用本项目（如 `dsh plugin add` 安装 `@wenaixi/dsh-superpower`），确认其已加载；
2. 在 `~/.dsh/skills/` 或项目 `.dsh/skills/` 下放置一个与 superpower 技能**同名**的本地技能目录（例如 `brainstorming/`、`writing-plans/`）；
3. 在任意会话中列出技能（例如询问模型“列出当前可用的技能”或调用对应宿主命令），观察该技能的实际来源：
   - 若显示来源为本项目（provider 为 `superpowers` 或相应 provider 名）→ 本插件优先级最高，验证通过；
   - 若显示来源为本地目录 → 优先级未生效，请检查 rank 配置或文档说明后重试。

预期结果：同一技能名只出现一次，且其来源为本项目。

> 说明：DSH 技能注册表在**同层**同名时按 `rank → 提供方顺序 → 本地顺序` 裁决，**rank 越小优先级越高**；本项目 `SUPERPOWERS_RANK` 为 `10`，小于官方 `dsh-skill-filesystem` 的项目/用户根（100–500）与官方 bundled（600），因此：
>
> - 用户/项目自装的同名技能、官方 bundled 中的同名技能均**不会**覆盖本项目（本项目始终胜出）；
> - 只有在某来源把同名技能注册到 rank < 10 时，本项目才会被覆盖（host 运行时可至 250，仍高于本项目；一般场景不会出现）。

如需调整本项目优先级，可修改 `src/superpowers.ts` 中的 `SUPERPOWERS_RANK` 并重新构建；注意 rank 越小优先级越高，设为 100 以上将低于 filesystem 项目根，导致用户同名技能反超。
