# dsh-superpower

[![Version](https://img.shields.io/badge/version-6.3.0--dsh.2-blue)](./package.json)
[![npm](https://img.shields.io/npm/v/dsh-superpower?label=npm)](https://www.npmjs.com/package/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)

[obra/superpowers](https://github.com/obra/superpowers) 的 DSH 完整移植 — 14 个技能注入 `ctx.skills`，开箱即用，全中文。

> 上游 `v6.3.0` → 本包 `6.3.0-dsh.2`（`-dsh.N` 仅演进预发布位，基线与上游严格同步）

## 安装

> 以主工作台 `web` 为例，换其它 profile 改 `--profile` 后名字即可。均走 `dsh.bundle`，零构建、零白名单。

**前置**：`Node >=20`、`pnpm >=9`、`dsh`（`npm i -g @deepseek-ai/dsh`）

```bash
# A — npm（推荐，latest=6.3.0-dsh.2）
dsh plugin --profile web add dsh-superpower
dsh plugin --profile web add dsh-superpower@6.3.0-dsh.2  # 锁定版本

# B — GitHub 直装（无视镜像延迟）
dsh plugin --profile web add github:Wenaixi/dsh-superpower#v6.3.0-dsh.2

# 验证
dsh --profile web --dump-config | grep -A2 "dsh-superpower"
# # == dsh-superpower / - id: superpowers

dsh --profile web  # 进会话，技能自动可用
```

其它：`git clone ... && pnpm install && pnpm build && dsh plugin --profile web add ./` / `pnpm pack` 后 `dsh plugin --profile web add ./dsh-superpower-6.3.0-dsh.2.tgz`

更新/卸载：`dsh plugin --profile web add dsh-superpower@6.3.0-dsh.2` / `dsh plugin --profile web remove dsh-superpower`

## 是什么

强制性方法论而非可选建议：先设计 → 计划切片 → TDD → 系统化调试 → 评审集成。随 `dsh.bundle` 安装/卸载，不污染用户目录，HMR 自动重建。

## 包含技能

| 技能 | 触发时机 |
|---|---|
| `using-superpowers` | 任意会话起点（1% 原则） |
| `brainstorming` | 新功能前，Spike/Bounded/Architectural 分级 |
| `writing-plans` | 设计获批后，切 2–5 分钟任务 |
| `using-git-worktrees` | 隔离分支 |
| `executing-plans` / `subagent-driven-development` | 按计划执行，后者每任务一子智能体+两阶段评审 |
| `dispatching-parallel-agents` | 并行分发 |
| `test-driven-development` | RED-GREEN-REFACTOR |
| `systematic-debugging` / `verification-before-completion` | 调试闭环 |
| `requesting` / `receiving-code-review` | 评审 |
| `finishing-a-development-branch` | 集成 |
| `writing-skills` | 写新技能 |

映射：`Bash→pwsh`、`Read/Write→fs` 等见 `skills/using-superpowers/references/dsh-tools.md`。

## 使用

```
“帮我做 XXX”  → brainstorming → writing-plans → subagent-driven-development
“修这个缺陷”  → systematic-debugging
```

校验：`await ctx.skills.list({cwd})` 应有 14 条 `provider: superpowers`。

## 开发

```bash
pnpm install && pnpm build && pnpm typecheck && node scripts/verify.mjs  # 14/14 PASS
dsh --profile web --dump-config  # 断言 "# == dsh-superpower"
```

## 目录 / 版本

```
src/superpowers.ts  # SkillProvider rank 550
skills/             # 14 技能（中文化）
lib/                # 已提交，GitHub 直装零构建
```

基线 `6.3.0` 与上游同步；本包以 `-dsh.N` 演进。`tag v*` 触发发布，`push` 仅跑 CI。详见 `CHANGELOG.md`。

## 常见问题

404/镜像延迟用 `github:...#v6.3.0-dsh.2`；白名单不需要；`latest` 见 `npm view dsh-superpower --registry https://registry.npmjs.org`。

---
MIT，与上游一致。贡献见 `CONTRIBUTING.md`。感谢 [Jesse Vincent](https://blog.fsck.com) 与 DSH `dsh-skill` 架构。
