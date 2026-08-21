# dsh-superpower

[![Version](https://img.shields.io/badge/version-6.3.0-blue)](./package.json)
[![npm](https://img.shields.io/npm/v/dsh-superpower?label=npm)](https://www.npmjs.com/package/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)
[![Skills](https://img.shields.io/badge/skills-14-ff6b6b)](#包含技能)

[obra/superpowers](https://github.com/obra/superpowers) 的 **DSH 移植版** — 将完整的多智能体软件开发方法论以原生 DSH 技能的形式开箱即用。

> 上游 `obra/superpowers v6.3.0` 的完整移植：14 个方法论技能以 DSH 原生 `SkillProvider` 注入 `ctx.skills`，`rank 550` 可被项目级覆盖，安装即生效。所有技能正文已中文化。

- **上游**：https://github.com/obra/superpowers
- **npm**：https://www.npmjs.com/package/dsh-superpower
- **版本同步**：本仓库版本号与上游 `package.json` 保持一致（当前 `6.3.0`）
- **协议**：MIT

---

> **3 秒速览：一个人拿到怎么用？**
>
> 已装好 `dsh` 的话，选任意一行（零构建、零配置、零白名单）：
> ```bash
> # 方式 A — npm（最简，刚已发布到官方源）
> dsh plugin --profile demo add dsh-superpower
>
> # 方式 B — GitHub 直装（无需 npm 账号/登录）
> dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.0
>
> dsh --profile demo --dump-config   # 看到 "# == dsh-superpower" 即成功
> dsh --profile demo                 # 进会话，技能自动可用
> ```
> 两种方式均已提交 `lib/` 产物，开箱即用，无需 `onlyBuiltDependencies` 白名单。

---

## 目录

- [特性](#特性)
- [包含技能](#包含技能)
- [安装](#安装)
  - [前置要求](#前置要求)
  - [方式 A：npm 一键安装（推荐）](#方式-a-npm-一键安装推荐)
  - [方式 B：GitHub 直装（备选）](#方式-b-github-直装备选零配置)
  - [方式 C：本地克隆（二次开发）](#方式-c本地克隆二次开发联调)
  - [方式 D：tarball 离线分发](#方式-d-tarball-离线分发)
  - [验证安装成功](#验证安装成功)
  - [更新与卸载](#更新与卸载)
- [使用](#使用)
- [与 DSH 原生能力的分工](#与-dsh-原生能力的分工)
- [本地开发](#本地开发)
- [目录结构](#目录结构)
- [版本策略](#版本策略)
- [常见问题](#常见问题)
- [贡献](#贡献)
- [更新日志](#更新日志)
- [协议](#协议)
- [致谢](#致谢)

## 特性

- **零侵入**：以 DSH 标准 `SkillProvider` 注册，不新增 `ctx` 键，不污染宿主事件
- **可覆盖**：`rank 550` 介于 `user-agents (500)` 与 `bundled (600)` 之间，`.dsh/skills` 与 `~/.dsh/skills` 可按名覆盖
- **全中文化**：14 个 `SKILL.md` 及 20+ 辅助文档均已译为简体中文，代码/命令/路径保持原文
- **零构建安装**：仓库内已提交 `lib/` 产物，`prepack` 仅在打包时触发，`dsh plugin add` 无需 `onlyBuiltDependencies` 白名单
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

### 前置要求

- **Node.js** `>=20`（`node -v` 检查）
- **pnpm** `>=9`（DSH 的 profile 安装依赖它，`pnpm -v` 检查）
- **dsh CLI**（`dsh --version` 检查；未安装执行 `npm i -g @deepseek-ai/dsh`）

> 首次使用 `dsh plugin` 会自动以 `@deepseek-ai/dsh-base` 初始化对应 profile，无需手动创建。

### 方式 A：npm 一键安装（推荐）

> 已发布到 [npm 官方源](https://www.npmjs.com/package/dsh-superpower)，国内镜像（`npmmirror`）同步可能有几分钟延迟。

```bash
# 安装到名为 demo 的 profile（首次会自动初始化该 profile）
dsh plugin --profile demo add dsh-superpower

# 锁定到精确版本（可选，推荐团队协作时锁定）
dsh plugin --profile demo add dsh-superpower@6.3.0

# 断言层已生效（应能看到 "# == dsh-superpower" 与 "id: superpowers"）
dsh --profile demo --dump-config | grep -A2 "dsh-superpower"

# 启动，技能自动可用
dsh --profile demo
```

### 方式 B：GitHub 直装（备选，零配置）

适合 **“不想走 npm、或 npm 镜像尚未同步”** 的场景。直接从 GitHub 拉取，无需本机有本仓库的检出。

```bash
# 锁定到标签 v6.3.0（推荐，避免后续推送悄悄改变运行内容）
dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.0

# 想跟最新 main 可去掉 #v6.3.0
dsh plugin --profile demo add github:Wenaixi/dsh-superpower
```

> **无需白名单**：自 `v6.3.0 (596b979)` 起，仓库已提交 `lib/` 产物，脚本由 `prepare` 改为 `prepack`（仅 `npm pack`/`npm publish` 时触发），因此 `dsh plugin add github:...` 不再触发 pnpm 的 `onlyBuiltDependencies` 拦截，开箱即用。

### 方式 C：本地克隆（二次开发/联调）

适合要改技能正文、调 `rank`、或对照上游做中文化的开发者。

```bash
git clone https://github.com/Wenaixi/dsh-superpower.git
cd dsh-superpower
pnpm install && pnpm build        # 产物输出到 lib/，lib/ 已提交但本地改动后需重建
node scripts/verify.mjs            # 冒烟：应输出 14/14 PASS

# 以本地路径安装到 profile（pnpm 会以 link: 形式依赖，改动后重新 pnpm build 即可生效）
dsh plugin --profile demo add ./
dsh --profile demo --dump-config   # 断言 "# == dsh-superpower"
dsh --profile demo
```

后续改动 `skills/` 或 `src/` 后，只需 `pnpm build`，重启对应 profile 即生效（`ctx.effect` 会自动清理旧 Provider）。

### 方式 D：tarball 离线分发

```bash
pnpm build
pnpm pack                      # 产出 dsh-superpower-6.3.0.tgz（已包含 lib/ + skills/）

# 接收方（无需本仓库、无需构建）：
dsh plugin --profile demo add ./dsh-superpower-6.3.0.tgz
```

tarball 已包含构建产物，同样无需白名单。

### 验证安装成功

```bash
# 1. 配置层可见
dsh --profile demo --dump-config | grep -A2 "dsh-superpower"
# 期望输出：
# # == dsh-superpower
# - id: superpowers
#   name: dsh-superpower

# 2. 冒烟（本地检出时）
node scripts/verify.mjs
# 期望：found 14 skill directories ... ALL PASS

# 3. 会话内（模型侧，安装后重启 profile 再验证）
# await ctx.skills.list({ cwd: "/path/to/project" }) // 14 条，provider: superpowers, source: bundled
# await ctx.skills.get("brainstorming")               // 返回含中文正文的完整 SKILL.md

# 4. npm 可见性
npm view dsh-superpower version --registry https://registry.npmjs.org
# 6.3.0
```

### 更新与卸载

```bash
# 更新到指定版本（npm）
dsh plugin --profile demo add dsh-superpower@6.3.1

# 更新到指定版本（GitHub）
dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.1

# 更新到最新 main（不推荐长期锁定场景）
dsh plugin --profile demo add github:Wenaixi/dsh-superpower

# 卸载
dsh plugin --profile demo remove dsh-superpower
```

> 每个 profile 独立：`demo`、`web`、`my-project` 等 profile 需分别安装。

## 使用

安装后无需额外配置。模型侧通过 `skill` 工具或用户显式指令 `/skill superpowers:<名称>` 加载：

- “帮我做一个 XXX 功能” → 自动触发 `brainstorming`
- “修一下这个缺陷” → 自动触发 `systematic-debugging`
- “先出个计划” → 触发 `writing-plans`

不走技能也能在模型侧直接验证：

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

或在 `cordis.patch.yml` 中覆盖技能目录（指向本地上游检出，便于对照）：

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
└── lib/                        # 构建产物（已提交，确保 GitHub 直装零构建）
```

## 版本策略

- 本仓库 `version` 与上游 `obra/superpowers` 的 `package.json#version` **严格同步**（当前 `6.3.0`）
- 上游发版后，本仓库同步 bump 版本、同步 `skills/` 内容（保留 DSH 映射与中文化），再发布
- `CHANGELOG.md` 汇总上游 Release Notes 与本仓库 DSH 适配变更

## 常见问题

**Q：一个人拿到链接，怎么最快用上？**

A：装好 `dsh` 后一行即可：`dsh plugin --profile demo add dsh-superpower`（npm 官方源），或 `dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.0`（无需 npm）。然后 `dsh --profile demo`。

**Q：必须发布到 npm 吗？已经发布了吗？**

A：已发布到 [npm 官方源](https://www.npmjs.com/package/dsh-superpower)（`dsh-superpower@6.3.0`）。两种方式均可用：`npm` 最简（`add dsh-superpower`），`GitHub` 适合不想走 npm 时。

**Q：`dsh plugin add dsh-superpower` 报 404？**

A：若你用的是国内镜像 `npmmirror`，同步到新版本有几分钟延迟，可先用 `github:Wenaixi/dsh-superpower#v6.3.0`，或切官方源 `npm config set registry https://registry.npmjs.org` 后重试。`npm view dsh-superpower --registry https://registry.npmjs.org` 可直连验证。

**Q：需要配置 `onlyBuiltDependencies` / `allowBuilds` 白名单吗？**

A：不需要。自 `596b979` 起 `lib/` 已提交且脚本改为 `prepack`，GitHub 与 npm（含 tarball）均零白名单、零现场构建。如仍见 `Ignored build scripts` 提示，说明你拉到的是旧标签，请用 `#v6.3.0`（新）重装。

**Q：安装后如何确认生效？**

A：`dsh --profile demo --dump-config | grep dsh-superpower` 应能看到 `# == dsh-superpower` 层；进会话后 `ctx.skills.list()` 应有 14 条 `superpowers`。

**Q：`pnpm install` 时 registry 是 `npmmirror` 有影响吗？**

A：对 GitHub 直装无影响（走 git）。仅 `npm publish` 与 `npm view --registry https://registry.npmjs.org` 需直连官方源。

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
