# dsh-superpower

[![npm](https://img.shields.io/npm/v/@wenaixi%2Fdsh-superpower?label=npm)](https://www.npmjs.com/package/@wenaixi/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)

[obra/superpowers](https://github.com/obra/superpowers) 的 DSH 专属移植版 — 15 个技能注入 `ctx.skills`，开箱即用，全中文，**仅支持 DSH (DeepSeek Harness) 平台**，不提供其它 AI 宿主适配。

## 安装

> 以主工作台 `web` 为例，其它 profile 改 `--profile` 后名字即可。均走 `dsh.bundle`，零构建、零白名单。

**前置**：`Node >=20`、`pnpm >=9`、`dsh`（`npm i -g @deepseek-ai/dsh`）。

```bash
# A — npm（推荐，自动安装最新）
dsh plugin --profile web add @wenaixi/dsh-superpower

# B — GitHub 直装（无视镜像延迟）
dsh plugin --profile web add github:Wenaixi/dsh-superpower

# 验证
dsh --profile web --dump-config | grep -A2 "@wenaixi/dsh-superpower"
# # == @wenaixi/dsh-superpower / - id: superpowers

dsh --profile web  # 进会话，技能自动可用
```

> 如需锁定版本，在包名后追加 `@<version>`（如 `@wenaixi/dsh-superpower@7.0.0`）或 `#v7.0.0`（GitHub 形式）。
>
> > 旧名 `dsh-superpower`（无 scope）已废弃并 `npm deprecate`，请改用 `@wenaixi/dsh-superpower`。

其它：

```bash
git clone https://github.com/Wenaixi/dsh-superpower.git && cd dsh-superpower
pnpm install && pnpm build && node scripts/verify.mjs   # 15/15 PASS
dsh plugin --profile web add ./                           # 本地路径安装
pnpm pack && dsh plugin --profile web add ./wenaixi-dsh-superpower-*.tgz  # 离线 tarball

# 更新 / 卸载（同样自动取最新）
dsh plugin --profile web add @wenaixi/dsh-superpower
dsh plugin --profile web remove @wenaixi/dsh-superpower
```

## 是什么

强制性方法论而非可选建议：先设计 → 计划切片 → TDD → 系统化调试 → 评审集成。随 `dsh.bundle` 安装/卸载，不污染用户目录，HMR 自动重建。

## 包含技能

| 技能 | 触发时机 |
|---|---|
| `using-superpowers` | 任意会话起点（1% 原则） |
| `brainstorming` | 新功能前，Spike / Bounded / Architectural 分级 |
| `writing-plans` | 设计获批后，切"一项可校验结果的动作"任务 |
| `using-git-worktrees` | 隔离分支 |
| `executing-plans` / `subagent-driven-development` | 按计划执行，前者内联整跑一次终审，后者每任务一 subagent + 两阶段评审 |
| `dispatching-parallel-agents` | 并行分发 |
| `test-driven-development` | RED-GREEN-REFACTOR |
| `systematic-debugging` / `verification-before-completion` | 调试闭环 |
| `requesting-code-review` / `receiving-code-review` | 评审 |
| `diagnosing-superpowers` | 会话出问题后定位根因（`path:line` 证据） |
| `finishing-a-development-branch` | 集成 |
| `writing-skills` | 写新技能 |

映射：`Bash→pwsh`、`Read/Write→fs` 等见 `skills/using-superpowers/references/dsh-tools.md`。

> **同名技能优先（本插件优先级最高）**：官方注册表同层重名按 `rank → 提供方顺序 → 本地顺序` 裁决，**rank 越小优先级越高**；本包 rank 10 小于 `dsh-skill-filesystem` 的项目/用户根（100–500）与官方内置 bundled（600），因此与本包同名的本地技能（`~/.dsh/skills`、项目 `.dsh/skills` 等）或官方 bundled 技能均由本包胜出，本插件技能唯一生效。

## 使用

```
“帮我做 XXX”  → brainstorming → writing-plans → subagent-driven-development
“修这个缺陷”  → systematic-debugging
“帮我评审”    → requesting-code-review
“刚才会话出问题了” → diagnosing-superpowers
```

校验：`await ctx.skills.list({cwd})` 应有 15 条 `provider: superpowers`。

## 开发

```bash
pnpm install && pnpm build && pnpm typecheck && node scripts/verify.mjs
node scripts/check-same-name-priority.mjs    # 同名优先实测一：自研桩（rank 100/300/500/600 均不抢 / rank 0 可抢）
node scripts/check-same-name-priority-fs.mjs # 同名优先实测二：官方 dsh-skill-filesystem 同层实测（rank 300 不抢）
dsh --profile web --dump-config  # 断言 "# == @wenaixi/dsh-superpower"
```

## 目录

```
src/superpowers.ts  # SkillProvider rank 10（本插件技能优先级最高）
skills/             # 15 技能（中文化，v7.0.0 起无 superpower- 前缀）
lib/                # 已提交，GitHub 直装零构建
```

版本：`v7.0.0` 起技能名回归上游命名（无 `superpower-` 前缀）并整批同步上游 `obra/superpowers v6.4.2`；本插件技能优先级最高（rank 10），同名技能本包胜出。自本版起本插件为 **DSH 专属**，已移除全部非 DSH 平台（Claude Code、Codex、Gemini CLI、Hermes、Muse、Pi、Antigravity、Copilot CLI）的参考文档与兼容层。详见 `CHANGELOG.md`。

## 常见问题

404/镜像延迟请改用 GitHub 形式；白名单不需要；`latest` 可用 `npm view @wenaixi/dsh-superpower --registry https://registry.npmjs.org` 查看。

## 协议

MIT，与上游 [obra/superpowers](https://github.com/obra/superpowers) 保持一致。详见 [`LICENSE`](./LICENSE)。

## 贡献

欢迎提交 Issue / PR。详见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 致谢

- 上游作者 [Jesse Vincent](https://blog.fsck.com) 与 [Prime Radiant](https://primeradiant.com)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 `dsh-skill` 三角色架构
