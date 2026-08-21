# dsh-superpower

[![Version](https://img.shields.io/badge/version-6.3.0-blue)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)
[![Skills](https://img.shields.io/badge/skills-14-ff6b6b)](#包含技能)

[obra/superpowers](https://github.com/obra/superpowers) 的 **DSH 移植版** — 将完整的多智能体软件开发方法论以原生 DSH 技能的形式开箱即用。

> 上游 `obra/superpowers v6.3.0` 的完整移植：14 个方法论技能以 DSH 原生 `SkillProvider` 注入 `ctx.skills`，`rank 550` 可被项目级覆盖，安装即生效。所有技能正文已中文化。

- **上游**：https://github.com/obra/superpowers
- **版本同步**：本仓库版本号与上游 `package.json` 保持一致（当前 `6.3.0`）
- **协议**：MIT

---

## 目录

- [特性](#特性)
- [包含技能](#包含技能)
- [安装](#安装)
- [使用](#使用)
- [与 DSH 原生能力的分工](#与-dsh-原生能力的分工)
- [本地开发](#本地开发)
- [目录结构](#目录结构)
- [版本策略](#版本策略)
- [贡献](#贡献)
- [更新日志](#更新日志)
- [协议](#协议)
- [致谢](#致谢)

## 特性

- **零侵入**：以 DSH 标准 `SkillProvider` 注册，不新增 `ctx` 键，不污染宿主事件
- **可覆盖**：`rank 550` 介于 `user-agents (500)` 与 `bundled (600)` 之间，`.dsh/skills` 与 `~/.dsh/skills` 可按名覆盖
- **全中文化**：14 个 `SKILL.md` 及 20+ 辅助文档均已译为简体中文，代码/命令/路径保持原文
- **DSH 工具映射**：`Bash→pwsh/bash`、`Read/Write/Edit→fs`、`Glob/Grep→fs-search`、`Task/Subagent→subagent/workflow` 等详见 [`skills/using-superpowers/references/dsh-tools.md`](./skills/using-superpowers/references/dsh-tools.md)
- **热更新友好**：`ctx.skills.registerProvider` 走 `ctx.effect`，HMR 时自动清理重建

## 包含技能

| 技能 | 触发时机 | 说明 |
|---|---|---|
| `using-superpowers` | 任意会话起点（1% 原则） | 强制先做技能检查，禁止无约束直接编码 |
| `brainstorming` | 任何创意/新功能工作前 | 三路径分类（Spike / Bounded / Architectural）+ 苏格拉底式设计细化 |
| `writing-plans` | 设计获批后 | 切片为 2–5 分钟可执行的细粒度任务 |
| `using-git-worktrees` | 设计获批后、编码前 | 隔离分支 + 干净基线验证 |
| `executing-plans` | 已有计划时 | 分批执行 + 人工检查点 |
| `subagent-driven-development` | 已有计划时（推荐） | 每任务一子智能体 + 两阶段评审 |
| `dispatching-parallel-agents` | 需要并行时 | 并发子智能体编排 |
| `test-driven-development` | 任何功能/缺陷修复时 | RED-GREEN-REFACTOR 铁律 |
| `systematic-debugging` | 修复缺陷时 | 4 阶段根因追踪 + 纵深防御 + 条件等待 |
| `verification-before-completion` | 声称完成前 | 必须运行验证命令并用证据说话 |
| `requesting-code-review` | 任务间 | 按严重度报告问题，Critical 级别阻塞 |
| `receiving-code-review` | 收到评审后 | 回应反馈 |
| `finishing-a-development-branch` | 全部任务完成后 | 验证测试 + 合并/PR/保留/丢弃决策 |
| `writing-skills` | 创建新技能时 | 技能编写最佳实践 |

## 安装

### 要求

- Node.js `>=20`
- `pnpm >=9`（DSH profile 管理依赖它）
- 已安装 `dsh` CLI（`npm i -g @deepseek-ai/dsh`）

### 方式一：本地联调（推荐）

```bash
pnpm install && pnpm build
dsh plugin --profile demo add ./   # 首次会自动以 @deepseek-ai/dsh-base 初始化 profile
dsh --profile demo --dump-config   # 应能看到 "# == dsh-superpower" 层
dsh --profile demo                 # 启动后技能自动可用
```

### 方式二：从 GitHub 直接安装

```bash
dsh plugin --profile demo add github:Wenaixi/dsh-superpower
```

### 方式三：从 npm / tarball

```bash
dsh plugin --profile demo add dsh-superpower
# 或
pnpm pack && dsh plugin --profile demo add ./dsh-superpower-6.3.0.tgz
```

### 卸载

```bash
dsh plugin --profile demo remove dsh-superpower
```

## 使用

安装后无需额外配置。模型侧通过 `skill` 工具或用户显式指令 `/skill superpowers:<名称>` 加载：

- “帮我做一个 XXX 功能” → 自动触发 `brainstorming`
- “修一下这个缺陷” → 自动触发 `systematic-debugging`
- “先出个计划” → 触发 `writing-plans`

在任意项目目录验证：

```js
// 在 DSH 会话中（模型侧）
await ctx.skills.list({ cwd: "/path/to/project" }) // 14 条 superpowers/bundled
await ctx.skills.get("brainstorming")               // 完整 SKILL.md 正文
```

## 与 DSH 原生能力的分工

- `dsh-plan-mode`（只读规划锁定）负责计划模式的开关与轮次边界；本插件的 `writing-plans` 负责把已批准设计切片为可执行任务
- `dsh-skill-filesystem` 的 `~/.dsh/skills` 与 `.dsh/skills` 优先级高于本插件（`rank 550`），可在项目级覆盖同名 superpowers 技能
- `subagent` / `workflow` / `todo` / `goal` / `ask-user` 等 DSH 工具与技能正文中的映射见 `dsh-tools.md`

## 本地开发

```bash
pnpm install
pnpm build        # tsc -p tsconfig.build.json -> lib/
pnpm typecheck    # tsc --noEmit
node scripts/verify.mjs  # 冒烟：14 个技能可列举 + 可加载
```

不走 profile 安装时，可用补丁叠加层本地调试：

```bash
pnpm dsh web --patch ./cordis.patch.yml
```

或在 `cordis.patch.yml` 中覆盖技能目录（指向本地上游检出）：

```yaml
- insert:
    - id: superpowers
      name: dsh-superpower
      config:
        skillDir: E:/tmp/superpowers/skills
```

### 代码规范

- 插件入口 `src/superpowers.ts`：函数形态 `export function apply(ctx, config)`，`inject = ['skills']`，配置走 Schemastery
- 失败要响亮：非法 frontmatter 仅跳过该技能并 `warn`，不吞整体
- 注释与提交信息使用简体中文，代码注释同

## 目录结构

```
dsh-superpower/
├── src/superpowers.ts          # 插件入口 + SuperpowersProvider (rank 550)
├── skills/                     # 14 个技能（已中文化，含 references/scripts）
│   ├── using-superpowers/references/dsh-tools.md
│   ├── brainstorming/
│   ├── writing-plans/
│   └── ...
├── scripts/verify.mjs          # 冒烟：校验 14 技能 + 关键文件
├── cordis.patch.yml            # bundle 层：insert superpowers
├── package.json                # dsh.bundle.patch 指向 cordis.patch.yml
├── tsconfig.json
└── lib/                        # 构建产物（不提交）
```

## 版本策略

- 本仓库 `version` 与上游 `obra/superpowers` 的 `package.json#version` **严格同步**（当前 `6.3.0`）
- 上游发版后，本仓库同步 bump 版本、同步 `skills/` 内容（保留 DSH 映射与中文化），再发布
- `CHANGELOG.md` 汇总上游 Release Notes 与本仓库 DSH 适配变更

## 贡献

欢迎提交 Issue / PR：

1. Fork 本仓库，基于 `main` 新建分支
2. 遵循 `writing-skills` 技能的编写与测试规范
3. `pnpm build && pnpm typecheck && node scripts/verify.mjs` 全绿后再提交
4. 提交 PR 时请说明关联的上游版本与改动范围

详见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 更新日志

见 [`CHANGELOG.md`](./CHANGELOG.md)（上游 `v6.3.0` 及之前版本汇总 + DSH 移植变更）。

## 协议

MIT，与上游 [obra/superpowers](https://github.com/obra/superpowers) 保持一致。见 [`LICENSE`](./LICENSE)。

## 致谢

- 上游作者 [Jesse Vincent](https://blog.fsck.com) 与 [Prime Radiant](https://primeradiant.com)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 `dsh-skill` 三角色架构
