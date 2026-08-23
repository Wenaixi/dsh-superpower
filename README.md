# dsh-superpower

[![npm](https://img.shields.io/npm/v/@wenaixi%2Fdsh-superpower?label=npm)](https://www.npmjs.com/package/@wenaixi/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)

[obra/superpowers](https://github.com/obra/superpowers) 的 DSH 完整移植 — 14 个技能注入 `ctx.skills`，开箱即用，全中文。

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

> 如需锁定版本，在包名后追加 `@<version>`（如 `@wenaixi/dsh-superpower@<version>`）或 `#v<version>`（GitHub 形式）。
>
> > ⚠️ 旧名 `dsh-superpower`（无 scope）已废弃并 `npm deprecate`，请改用 `@wenaixi/dsh-superpower`。

其它：

```bash
git clone https://github.com/Wenaixi/dsh-superpower.git && cd dsh-superpower
pnpm install && pnpm build && node scripts/verify.mjs   # 14/14 PASS
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
| `superpower-using-superpowers` | 任意会话起点（1% 原则） |
| `superpower-brainstorming` | 新功能前，Spike / Bounded / Architectural 分级 |
| `superpower-writing-plans` | 设计获批后，切 2–5 分钟任务 |
| `superpower-using-git-worktrees` | 隔离分支 |
| `superpower-executing-plans` / `superpower-subagent-driven-development` | 按计划执行，后者每任务一子智能体 + 两阶段评审 |
| `superpower-dispatching-parallel-agents` | 并行分发 |
| `superpower-test-driven-development` | RED-GREEN-REFACTOR |
| `superpower-systematic-debugging` / `superpower-verification-before-completion` | 调试闭环 |
| `superpower-requesting` / `superpower-receiving-code-review` | 评审 |
| `superpower-finishing-a-development-branch` | 集成 |
| `superpower-writing-skills` | 写新技能 |

映射：`Bash→pwsh`、`Read/Write→fs` 等见 `skills/using-superpowers/references/dsh-tools.md`。

## 使用

```
“帮我做 XXX”  → superpower-brainstorming → superpower-writing-plans → superpower-subagent-driven-development
“修这个缺陷”  → superpower-systematic-debugging
“帮我评审”    → superpower-requesting-code-review
```

校验：`await ctx.skills.list({cwd})` 应有 14 条 `provider: superpowers`。

## 开发

```bash
pnpm install && pnpm build && pnpm typecheck && node scripts/verify.mjs
dsh --profile web --dump-config  # 断言 "# == @wenaixi/dsh-superpower"
```

## 目录

```
src/superpowers.ts  # SkillProvider rank 550
skills/             # 14 技能（中文化）
lib/                # 已提交，GitHub 直装零构建
```

版本：基线与上游 `obra/superpowers` 严格同步，本包以 `-dsh.N` 在基线上演进；`tag v*` 触发发布，`push` 仅跑 CI。详见 `CHANGELOG.md`。

## 常见问题

404/镜像延迟请改用 GitHub 形式；白名单不需要；`latest` 可用 `npm view @wenaixi/dsh-superpower --registry https://registry.npmjs.org` 查看。

## 协议

MIT，与上游 [obra/superpowers](https://github.com/obra/superpowers) 保持一致。详见 [`LICENSE`](./LICENSE)。

## 贡献

欢迎提交 Issue / PR。详见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 致谢

- 上游作者 [Jesse Vincent](https://blog.fsck.com) 与 [Prime Radiant](https://primeradiant.com)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 `dsh-skill` 三角色架构
