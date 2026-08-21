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

> **3 秒速览：一个人拿到怎么用？**
>
> 已装好 `dsh` 的话，只需一行（零构建、零配置）：
> ```bash
> dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.0
> dsh --profile demo --dump-config   # 看到 "# == dsh-superpower" 即成功
> dsh --profile demo                 # 进会话，技能自动可用
> ```
> 还没发布到 npm 也完全可用，无需 `npm publish`。详见 [安装](#安装)。

---

## 目录

- [特性](#特性)
- [包含技能](#包含技能)
- [安装](#安装)
  - [前置要求](#前置要求)
  - [方式一：GitHub 一键安装（推荐）](#方式一github-一键安装推荐零配置无需-npm)
  - [方式二：本地克隆（二次开发/联调）](#方式二本地克隆二次开发联调推荐)
  - [方式三：npm / tarball（可选）](#方式三npm--tarball可选当前未发布到-npm)
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

### 方式一：GitHub 一键安装（推荐，零配置，无需 npm）

适合 **“路人同事刚拿到链接，3 分钟内可用”** 的场景。本方式直接从 GitHub 拉取源码，无需本机有本仓库的检出，也无需发布到 npm。

```bash
# 安装到名为 demo 的 profile（首次会自动初始化该 profile）
dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.0

# 断言层已生效（应能看到 "# == dsh-superpower" 与 "id: superpowers"）
dsh --profile demo --dump-config | grep -A2 "dsh-superpower"

# 启动，技能自动可用
dsh --profile demo
```

锁定到标签 `#v6.3.0` 可保证后续上游推送不会悄悄改变实际运行内容；想跟最新 `main` 可去掉 `#v6.3.0`。

**关于 `prepare` 构建**：本包 `package.json` 声明了 `prepare: npm run build`，`dsh plugin add github:...` 时会由 pnpm 在本地自动执行 `tsc` 编译出 `lib/`，无需你手动构建。产物自包含，不依赖仓库外的 monorepo 上下文。

**首次安装可能遇到的 `allowBuilds` 授权**：pnpm `>=10` 默认拒绝执行来自 git 依赖的 `prepare` 脚本，首次 `add` 会失败并打印类似：

```
Ignored build scripts: dsh-superpower
Run "pnpm approve-builds" or add to pnpm-workspace.yaml: allowBuilds: { dsh-superpower: true }
```

按提示操作一次即可（这是 pnpm 的安全机制，授权仅表示允许该包在**安装时**执行其 `prepare`）：

```bash
# 在报错的 profile 目录下（提示中会给出路径，如 C:\Users\你\.dsh\profiles\demo）
# 编辑 pnpm-workspace.yaml，加入：
# allowBuilds:
#   dsh-superpower: true
# 然后重新执行：
dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.0
```

或执行 `pnpm approve-builds` 按交互授权。只对源码可信的包授权即可。

### 方式二：本地克隆（二次开发/联调，推荐）

适合要改技能正文、调 `rank`、或对照上游做中文化的开发者。

```bash
git clone https://github.com/Wenaixi/dsh-superpower.git
cd dsh-superpower
pnpm install && pnpm build        # 产物输出到 lib/，lib/ 不提交
node scripts/verify.mjs            # 冒烟：应输出 14/14 PASS

# 以本地路径安装到 profile（pnpm 会以 link: 形式依赖，改动后重新 pnpm build 即可生效）
dsh plugin --profile demo add ./
dsh --profile demo --dump-config   # 断言 "# == dsh-superpower"
dsh --profile demo
```

后续改动 `skills/` 或 `src/` 后，只需 `pnpm build`，重启对应 profile 即生效（`ctx.effect` 会自动清理旧 Provider）。

### 方式三：npm / tarball（可选，当前未发布到 npm）

> **需要发布 npm 吗？不需要。** 上述 GitHub 直装已完全可用。发布到 npm 只是为了让安装命令能简写为 `dsh plugin --profile demo add dsh-superpower`（省去 `github:` 前缀与 `#tag`），并让 `npm` 镜像（如 `npmmirror`）可检索到包。

当前 `dsh-superpower` **尚未发布到 npm**，因此 `dsh plugin --profile demo add dsh-superpower` 会报 `404`。如需走 npm 渠道，有两种选择：

**A. 发布者发布到 npm（一次性）**：

```bash
# 需先 npm login（registry 需切回 https://registry.npmjs.org，而非 npmmirror）
npm login
pnpm build
npm publish --access public   # 首次发布
# 之后他人即可：
dsh plugin --profile demo add dsh-superpower
```

**B. 不发布，用 tarball 分发（无需授权）**：

```bash
pnpm build
pnpm pack                      # 产出 dsh-superpower-6.3.0.tgz（已包含 lib/ + skills/）

# 接收方（无需本仓库、无需构建）：
dsh plugin --profile demo add ./dsh-superpower-6.3.0.tgz
```

tarball 已包含构建产物，接收方无需执行 `prepare`，也就无需 `allowBuilds` 授权。

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
```

### 更新与卸载

```bash
# 更新到指定版本（GitHub 直装）
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
└── lib/                        # 构建产物（不提交）
```

## 版本策略

- 本仓库 `version` 与上游 `obra/superpowers` 的 `package.json#version` **严格同步**（当前 `6.3.0`）
- 上游发版后，本仓库同步 bump 版本、同步 `skills/` 内容（保留 DSH 映射与中文化），再发布
- `CHANGELOG.md` 汇总上游 Release Notes 与本仓库 DSH 适配变更

## 常见问题

**Q：一个人拿到链接，怎么最快用上？**

A：装好 `dsh` 后一行即可，无需克隆本仓库：`dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.0`，然后 `dsh --profile demo`。这是推荐方式。

**Q：必须发布到 npm 吗？**

A：不必。GitHub 直装已完全可用。发到 npm 只是让命令可简写为 `dsh plugin --profile demo add dsh-superpower`，并让 `npm view` / 镜像可检索。当前本包尚未发布到 npm，走 GitHub 或 tarball 即可。

**Q：`dsh plugin add dsh-superpower` 报 404？**

A：因为尚未发布到 npm，请改用 `github:Wenaixi/dsh-superpower#v6.3.0` 或本地 `pnpm pack` 后的 `*.tgz`。发布到 npm 后该命令即生效。

**Q：首次 `add github:...` 报 `Ignored build scripts` / `allowBuilds`？**

A：pnpm `>=10` 的安全策略。按报错提示在对应 profile 的 `pnpm-workspace.yaml` 中加入 `allowBuilds: { dsh-superpower: true }` 后重试，或改用 `pnpm pack` 的 tarball（无需授权）。

**Q：安装后如何确认生效？**

A：`dsh --profile demo --dump-config | grep dsh-superpower` 应能看到 `# == dsh-superpower` 层；进会话后 `ctx.skills.list()` 应有 14 条 `superpowers`。

**Q：`pnpm install` 时 registry 是 `npmmirror` 有影响吗？**

A：对 GitHub 直装无影响（走 git）。仅在你执行 `npm publish` 或他人执行 `npm view dsh-superpower` 时才需切回 `https://registry.npmjs.org`。

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
