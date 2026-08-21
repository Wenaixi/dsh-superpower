# 更新日志

本文件记录 `dsh-superpower` 的所有值得关注的变更。版本号与上游 [obra/superpowers](https://github.com/obra/superpowers) 严格同步。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [6.3.0] - 2026-08-12

### 同步上游 v6.3.0

上游发布说明见 [obra/superpowers RELEASE-NOTES.md](https://github.com/obra/superpowers/blob/main/RELEASE-NOTES.md#v630-2026-08-12)。

- **Harness 支持**：新增 Devin CLI / Hermes Agent / Grok Build CLI 安装说明
- **Brainstorming**：仪式随任务分级（Spike / Bounded / Architectural），小任务跳过双文档仪式，但审批关卡不变
- **Subagent-Driven Development**：控制器不再因非灾难性分歧阻塞；冲突预检写入 ledger；同构小任务批量派发；实现者/评审者禁止再派生子代理；计划携带 `Spec:` 指针
- **Finishing a Development Branch**：`git worktree remove` 遇未提交内容时不再 `--force`，而是列出文件并询问
- **修复**：`render-graphs.js` Windows 兼容、Copilot CLI 后台化指引
- **其它**：上游 `v6.2.0` 及更早版本见上游 RELEASE-NOTES 全文

### 本仓库 DSH 移植

- 插件入口 `src/superpowers.ts`：`SkillProvider` 实现，`rank 550`，`providerName: superpowers`，`skillDir` 可配置，`ctx.effect` 清理
- 14 个技能及 20+ 辅助文档完整中文化，`frontmatter.name` 保持英文、`description` 译为简体中文，代码/命令/路径不译
- 新增 `skills/using-superpowers/references/dsh-tools.md`：Claude Code / Codex 工具到 DSH（`pwsh`/`bash`/`fs`/`fs-search`/`subagent`/`workflow`/`todo`/`skill`/`ask-user`）的映射表
- `using-superpowers` 的 Platform Adaptation 新增 DSH 条目，要求优先阅读 `dsh-tools.md`
- `package.json` 声明 `dsh.bundle.patch: ./cordis.patch.yml`，`cordis.patch.yml` 单行 `insert: [superpowers]`
- 构建 `tsc -p tsconfig.build.json -> lib/`，`pnpm typecheck` 通过，`scripts/verify.mjs` 冒烟 14 技能全绿
- `dsh --profile demo --dump-config` 可见 `# == dsh-superpower` 层

## [更早版本]

上游 `v6.2.0` / `v6.1.x` / `v6.0.x` 等变更见上游仓库 Release Notes。上游 `package.json#version` 变更时，本仓库同步 bump。

[6.3.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0
