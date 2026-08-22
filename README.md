# dsh-superpower

[![Version](https://img.shields.io/badge/version-6.3.0.2-blue)](./package.json)
[![npm](https://img.shields.io/npm/v/dsh-superpower?label=npm)](https://www.npmjs.com/package/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)
[![Skills](https://img.shields.io/badge/skills-14-ff6b6b)](#包含技能)
[![CI](https://github.com/Wenaixi/dsh-superpower/actions/workflows/ci.yml/badge.svg)](https://github.com/Wenaixi/dsh-superpower/actions)

[obra/superpowers](https://github.com/obra/superpowers) 的 **DSH 完整移植版** — 将久经验证的多智能体软件开发方法论，以 DSH 原生技能的形式开箱即用。

> 上游 `obra/superpowers v6.3.0` 的完整移植：14 个方法论技能以 DSH 原生 `SkillProvider` 注入 `ctx.skills`，`rank 550` 可被项目级覆盖，安装即生效。所有技能正文已中文化，零构建、零白名单、热更新友好。

- **上游**：https://github.com/obra/superpowers
- **npm**：https://www.npmjs.com/package/dsh-superpower (`dsh-superpower@6.3.0.2`, `latest`)
- **基线版本**：`6.3.0`（上游）；本包在该基线上以第四段 `.N` 演进，当前 `6.3.0.2`（基线不变，仅第四段递增）
- **协议**：MIT

---

> ### 3 秒速览：一个人拿到怎么用？
>
> 已装好 `dsh` 的话，任选一行（零构建、零配置、零白名单），装到**主工作台 `web`**：
>
> ```bash
> # 方式 A — npm（最简，已发布到官方源）
> dsh plugin --profile web add dsh-superpower
>
> # 方式 B — GitHub 直装（无需 npm 账号/登录）
> dsh plugin --profile web add github:Wenaixi/dsh-superpower#v6.3.0.2
>
> dsh --profile web --dump-config   # 看到 "# == dsh-superpower" 即成功
> dsh --profile web                 # 进会话，技能自动可用
> ```
>
> `web` 是 DSH 默认的主工作台（`dsh`/`dsh web` 不带 `--profile` 时即它）；装到其它 profile 只需改 `--profile` 后的名字。下文均以 `web` 为例。两种方式均已提交 `lib/` 产物，开箱即用，无需 `onlyBuiltDependencies` 白名单。

---

## 目录

- [为什么需要它](#为什么需要它)
- [特性](#特性)
- [包含技能](#包含技能)
- [工作原理](#工作原理)
- [安装](#安装)
- [使用](#使用)
- [与 DSH 原生能力的分工](#与-dsh-原生能力的分工)
- [工具映射](#工具映射)
- [本地开发](#本地开发)
- [目录结构](#目录结构)
- [版本策略](#版本策略)
- [常见问题](#常见问题)
- [贡献](#贡献)
- [更新日志](#更新日志)
- [协议](#协议)
- [致谢](#致谢)

## 为什么需要它

直接让模型写代码，往往一步到位、跳过设计，导致返工与技术债。`superpowers` 是一套**强制性方法论**而非可选建议：

1. **先设计再编码** — 任何创意工作前必须经过 `brainstorming`，把意图收敛为可评审的规格。
2. **计划可执行** — `writing-plans` 把规格切片为 2–5 分钟粒度的任务，`executing-plans`/`subagent-driven-development` 按计划推进，不偏离。
3. **测试先行** — `test-driven-development` 的 RED-GREEN-REFACTOR 铁律贯穿所有实现。
4. **调试有章法** — `systematic-debugging` → `verification-before-completion` 形成闭环，杜绝“看起来修好了”。
5. **协作可审计** — `requesting/receiving-code-review` 与 `finishing-a-development-branch` 覆盖评审与集成全流程。

本移植版把上述约束完整搬到 DSH：技能即 `SkillProvider`，随 `dsh.bundle` 安装与卸载，不污染用户目录，HMR 时自动重建。

## 特性

- **零侵入**：以 DSH 标准 `SkillProvider` 注册，不新增 `ctx` 键，不污染宿主事件。
- **可覆盖**：`rank 550` 介于 `user-agents (500)` 与 `bundled (600)` 之间，`.dsh/skills` / `~/.dsh/skills` 可按名覆盖本包，本包可覆盖内置 `bundled`。
- **全中文化**：14 个 `SKILL.md` 及 20+ 辅助文档均已译为简体中文，代码/命令/路径保持原文。
- **零构建安装**：仓库内已提交 `lib/` 产物，`prepack` 仅在 `npm pack`/`npm publish` 时触发，`dsh plugin add` 无需 `onlyBuiltDependencies` 白名单。
- **DSH 工具映射**：`Bash→pwsh/bash`、`Read/Write/Edit→fs`、`Glob/Grep→fs-search`、`Task/Subagent→subagent/workflow` 等，详见 [`skills/using-superpowers/references/dsh-tools.md`](./skills/using-superpowers/references/dsh-tools.md)。
- **热更新友好**：`ctx.skills.registerProvider` 走 `ctx.effect`，HMR 时自动清理重建。
- **CI 保障**：`push`/`PR` 仅跑校验（`build`/`typecheck`/`verify`/`pack`），`tag v*` 才发布到 npm，需 `NPM_TOKEN`（Bypass 2FA 的 Granular Token）。

## 包含技能

| 技能 | 触发时机 | 说明 | 辅助 |
|---|---:|---|---|
| `using-superpowers` | 任意会话起点（1% 原则） | 强制先做技能检查，禁止无约束直接编码 | `references/dsh-tools.md`（DSH 专属） |
| `brainstorming` | 任何创意/新功能工作前 | 三路径分类（Spike / Bounded / Architectural）+ 苏格拉底式设计细化 | `spec-document-reviewer-prompt.md`、`visual-companion.md`、`scripts/*` |
| `writing-plans` | 设计获批后 | 切片为 2–5 分钟可执行的细粒度任务 | `plan-document-reviewer-prompt.md` |
| `using-git-worktrees` | 设计获批后、编码前 | 隔离分支 + 干净基线验证 | — |
| `executing-plans` | 已有计划时 | 分批执行 + 人工检查点 | — |
| `subagent-driven-development` | 已有计划时（推荐） | 每任务一子智能体 + 两阶段评审 | `implementer/reviewer/re-review` 提示词 + `scripts/{review-package,sdd-workspace,task-brief}` |
| `dispatching-parallel-agents` | 需要并行时 | 并发子智能体编排 | — |
| `test-driven-development` | 任何功能/缺陷修复时 | RED-GREEN-REFACTOR 铁律 | `writing-good-tests.md` |
| `systematic-debugging` | 修复缺陷时 | 4 阶段根因追踪 + 纵深防御 + 条件等待 | `root-cause-tracing.md` 等 + 示例/脚本 |
| `verification-before-completion` | 声称完成前 | 必须运行验证命令并用证据说话 | — |
| `requesting-code-review` | 任务间 | 按严重度报告问题，Critical 级别阻塞 | `code-reviewer.md` |
| `receiving-code-review` | 收到评审后 | 回应反馈 | — |
| `finishing-a-development-branch` | 全部任务完成后 | 验证测试 + 合并/PR/保留/丢弃决策 | — |
| `writing-skills` | 创建新技能时 | 技能编写最佳实践 | `testing-skills-with-subagents.md` 等 |

> 技能的 `frontmatter.name` 保持英文 kebab-case，`description` 为 40–80 字简体中文；正文自然语言为中文，代码/命令/路径不译。

## 工作原理

```
用户意图
  → using-superpowers（1% 原则：先查技能）
  → brainstorming（Spike / Bounded / Architectural 分级，产出规格）
  → writing-plans（切片为可验证任务）
  → using-git-worktrees（隔离分支，可选）
  → executing-plans / subagent-driven-development（按计划执行，TDD 全程）
  → systematic-debugging / verification-before-completion（缺陷闭环）
  → requesting/receiving-code-review（评审）
  → finishing-a-development-branch（集成）
```

- **计划与执行的分离**：`writing-plans` 只产出计划，不写实现代码；`executing-plans`/`subagent-driven-development` 只按计划执行。
- **两阶段评审**：`subagent-driven-development` 每个子智能体产出后，先合规评审再质量评审，未通过则 `re-review` 闭环。
- **工具无关**：技能正文不硬编码工具名，具体映射由 `dsh-tools.md` 统一承载（见下）。

## 安装

### 前置要求

- **Node.js** `>=20`（`node -v`）
- **pnpm** `>=9`（`pnpm -v`，DSH 的 profile 安装依赖它）
- **dsh CLI**（`dsh --version`；未安装执行 `npm i -g @deepseek-ai/dsh`）

> 首次 `dsh plugin --profile <name> add ...` 会自动以 `@deepseek-ai/dsh-base` 初始化该 profile，无需手动创建。下文以主工作台 `web` 为例。

### 方式 A：npm 一键安装（推荐）

> 已发布到 [npm 官方源](https://www.npmjs.com/package/dsh-superpower)，当前 `latest` 为 `6.3.0.2`。国内镜像 `npmmirror` 同步有数分钟延迟。

```bash
# 安装到主工作台 web（自动走 dsh.bundle，无需手动改 cordis.patch.yml）
dsh plugin --profile web add dsh-superpower

# 锁定到精确版本（推荐团队协作）
dsh plugin --profile web add dsh-superpower@6.3.0.2

# 断言层已生效（应看到 "# == dsh-superpower" 与 "id: superpowers"）
dsh --profile web --dump-config | grep -A2 "dsh-superpower"

# 启动，技能自动可用
dsh --profile web
```

### 方式 B：GitHub 直装（备选，零配置）

适合 **“不想走 npm、或镜像尚未同步”** 的场景。同样自动走 `dsh.bundle`。

```bash
# 锁定到标签（推荐）
dsh plugin --profile web add github:Wenaixi/dsh-superpower#v6.3.0.2

# 跟最新 main（不推荐长期锁定）
dsh plugin --profile web add github:Wenaixi/dsh-superpower
```

> **无需白名单**：自 `v6.3.0` 起仓库已提交 `lib/` 产物，`package.json` 脚本由 `prepare` 改为 `prepack`（仅 `npm pack`/`publish` 时触发），因此 `dsh plugin add github:...` 不再触发 pnpm 的 `onlyBuiltDependencies` 拦截。

### 方式 C：本地克隆（二次开发/联调）

```bash
git clone https://github.com/Wenaixi/dsh-superpower.git
cd dsh-superpower
pnpm install && pnpm build        # 产物输出到 lib/，本地改动后需重建
node scripts/verify.mjs            # 冒烟：应输出 14/14 PASS

# 以本地路径安装到主工作台（link: 形式，改动后 pnpm build + 重启 profile 即生效）
dsh plugin --profile web add ./
dsh --profile web --dump-config   # 断言 "# == dsh-superpower"
dsh --profile web
```

### 方式 D：tarball 离线分发

```bash
pnpm build
pnpm pack                      # 产出 dsh-superpower-6.3.0.2.tgz（含 lib/ + skills/）

# 接收方无需本仓库、无需构建：
dsh plugin --profile web add ./dsh-superpower-6.3.0.2.tgz
```

### 验证安装成功

```bash
# 1. 配置层可见
dsh --profile web --dump-config | grep -A2 "dsh-superpower"
# # == dsh-superpower
# - id: superpowers
#   name: dsh-superpower

# 2. 冒烟（本地检出时）
node scripts/verify.mjs
# found 14 skill directories ... ALL PASS

# 3. 会话内（模型侧，需重启 profile 后）
# await ctx.skills.list({ cwd: "/path/to/project" }) // 14 条，provider: superpowers
# await ctx.skills.get("brainstorming")               // 含中文正文的完整 SKILL.md

# 4. npm 可见性
npm view dsh-superpower version --registry https://registry.npmjs.org
# 6.3.0.2
```

### 更新与卸载

```bash
# 更新（npm，示例为主工作台 web）
dsh plugin --profile web add dsh-superpower@6.3.0.2

# 更新（GitHub）
dsh plugin --profile web add github:Wenaixi/dsh-superpower#v6.3.0.2

# 卸载
dsh plugin --profile web remove dsh-superpower
```

> 每个 profile 独立：`web`、`demo`、`my-project` 等需分别安装。

## 使用

安装后无需额外配置。模型侧通过 `skill` 工具或用户显式指令 `/skill superpowers:<名称>` 触发：

| 你说 | 触发技能 |
|---|---|
| “帮我做一个 XXX 功能” | `brainstorming` → `writing-plans` → `subagent-driven-development` |
| “修一下这个缺陷” | `systematic-debugging` → `verification-before-completion` |
| “先出个计划” | `writing-plans` |
| “帮我评审一下” | `requesting-code-review` |
| “怎么收尾这个分支” | `finishing-a-development-branch` |

也可在模型侧直接验证：

```js
await ctx.skills.list({ cwd: "/path/to/project" }) // 14 条，provider: superpowers, source: bundled
await ctx.skills.get("brainstorming")               // 完整中文 SKILL.md
```

## 与 DSH 原生能力的分工

| 能力 | 归属 | 说明 |
|---|---|---|
| 只读规划锁定 | `dsh-plan-mode` | 负责 `plan` 模式的开关与轮次边界 |
| 细粒度任务切片 | 本包 `writing-plans` | 把已批准设计切片为可执行、可验证的任务 |
| 技能文件发现 | `dsh-skill-filesystem` | 扫描 `~/.dsh/skills` / `.dsh/skills`，`rank` 高于本包（可覆盖同名技能） |
| 子智能体编排 | `subagent` / `workflow` / `goal` / `todo` / `ask-user` | 与技能正文中的映射见 `dsh-tools.md` |

> `rank 550` 的设计意图：让项目级/用户级技能可覆盖本包，本包可覆盖 DSH 内置 `bundled`（600）。如需让本包强于项目级，可改 `SUPERPOWERS_RANK` 为 `90`，但会违背 DSH 约定，不推荐。

## 工具映射

| 上游提及 | DSH 等价 | 备注 |
|---|---:|---|
| `Bash` | `pwsh`（首选，Windows 友好）或 `bash` | 长耗时用 `run_in_background: true`，`job_output`/`job_list` 收敛 |
| `Read` / `Write` / `Edit` | `fs` 的 `read` / `write` / `edit` | `write`/`edit` 触发 `fs/observed` 失效 |
| `Glob` / `Grep` | `fs-search` 的 `glob` / `grep` | 大仓用 `include` 过滤 |
| `Task` / `Subagent` | `subagent` / `subagent_fork` / `workflow` | 单任务 `subagent`，多阶段 `workflow` |
| `AskUserQuestion` | `ask-user` | 阻塞式提问 |
| `TodoWrite` | `todo` | 全量列表，至少一项 `in_progress` |
| `Skill` | `skill` | `skill(name)` 与 `ctx.skills.get()` 同源 |
| `WebSearch` / `WebFetch` | `web` | 统一为 `web` 工具 |
| `git worktree` | `bash`/`pwsh` 直调 | DSH 无 worktree 专属封装 |

完整对照见 [`skills/using-superpowers/references/dsh-tools.md`](./skills/using-superpowers/references/dsh-tools.md)，`using-superpowers` 的 Platform Adaptation 中已置顶 DSH 条目，要求优先阅读。

**Windows 约束**：PowerShell 中 `ls -la`/`head` 等 Unix 别名不可用，用 `Get-ChildItem`/`Select-Object -First N`；所有 `waterfall` 监听必须调用 `next()`。

## 本地开发

```bash
pnpm install
pnpm build        # tsc -p tsconfig.build.json -> lib/
pnpm typecheck    # tsc --noEmit
node scripts/verify.mjs  # 14/14 PASS 且关键文件齐全
```

不走 profile 调试：

```bash
pnpm dsh web --patch ./cordis.patch.yml
```

覆盖技能目录（指向本地上游检出，便于对照）：

```yaml
- insert:
    - id: superpowers
      name: dsh-superpower
      config:
        skillDir: E:/tmp/superpowers/skills
```

### 插件入口

`src/superpowers.ts` — 函数形态，`inject = ['skills']`，配置走 Schemastery：

```ts
export const Config = Schema.object({
  providerName: Schema.string().default('superpowers'),
  skillDir: Schema.string(), // 默认 resolve(lib/.. / "skills")
})
export const name = 'superpowers'
export const inject = ['skills'] as const
export function apply(ctx: Context, config: Config) { /* registerProvider */ }
```

### 验证清单（完成前必检）

- [ ] `pnpm build` / `pnpm typecheck` 零错误
- [ ] `node scripts/verify.mjs` 输出 `14/14 PASS`
- [ ] `dsh --profile web --dump-config` 包含 `# == dsh-superpower`
- [ ] `ctx.skills.list()` 14 条 `provider: superpowers`，`get("brainstorming")` 含中文正文
- [ ] `SKILL.md` 的 frontmatter 为合法 YAML，`name` 为 kebab-case
- [ ] 文档与注释为简体中文，无 emoji

## 目录结构

```
dsh-superpower/
├── src/superpowers.ts          # 插件入口 + SuperpowersProvider (rank 550)
├── skills/                     # 14 技能（含 references/scripts/*.md），事实来源
│   └── using-superpowers/references/dsh-tools.md  # DSH 专属映射（勿删）
├── scripts/verify.mjs          # 冒烟：校验 14 技能 + 关键文件
├── cordis.patch.yml            # bundle 层：insert: [{ id: superpowers, name: dsh-superpower }]
├── package.json                # dsh.bundle.patch + version + repository/homepage/bugs
├── tsconfig.json / tsconfig.build.json
├── lib/                        # 构建产物（已提交，确保 GitHub 直装零构建）
├── .github/workflows/
│   ├── ci.yml                  # push/PR 仅跑校验
│   └── release.yml             # tag v* 才发布到 npm + 创建 Release
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── CLAUDE.md                   # 项目记忆库（开发宪法）
└── LICENSE
```

## 版本策略

- **基线**：`6.3.0`，与上游 `obra/superpowers` 严格同步。
- **本包演进**：仅涉及本仓库文档/构建/CI 等非功能修正时，以第四段 `.N` 演进（如 `6.3.0.1` → `6.3.0.2`，基线 `6.3.0` 不变，仅 `N` 递增），绝不产生与上游不一致的正式版本号。
- **上游发版后**：同步 `skills/` 内容（保留 `dsh-tools.md`）+ `package.json` 基线 bump，再发布正式版。
- **发布**：`tag v*` 触发 `release.yml`（需 `NPM_TOKEN`），自动 `npm publish` 并创建 GitHub Release；`push` 到 `main` 仅跑 CI 校验。

见 [`CHANGELOG.md`](./CHANGELOG.md)。

## 常见问题

**Q：一个人拿到链接，怎么最快用上？**

A：装好 `dsh` 后一行即可（主工作台 `web` 为例）：`dsh plugin --profile web add dsh-superpower`（npm）或 `dsh plugin --profile web add github:Wenaixi/dsh-superpower#v6.3.0.2`（GitHub），然后 `dsh --profile web`。

**Q：必须发布到 npm 吗？**

A：已发布到 [npm 官方源](https://www.npmjs.com/package/dsh-superpower)（`latest` 为 `6.3.0.2`）。GitHub 直装同样可用，适合不想走 npm 时。

**Q：`dsh plugin add dsh-superpower` 报 404？**

A：若用国内镜像 `npmmirror`，同步有数分钟延迟，可先用 `github:...#v6.3.0.2`，或切官方源后重试：`npm view dsh-superpower --registry https://registry.npmjs.org`。

**Q：需要配置 `onlyBuiltDependencies` 白名单吗？**

A：不需要。自 `6.3.0` 起 `lib/` 已提交且脚本改为 `prepack`，GitHub 与 npm（含 tarball）均零白名单。

**Q：安装后如何确认生效？**

A：`dsh --profile web --dump-config | grep dsh-superpower` 应看到 `# == dsh-superpower`；进会话后 `ctx.skills.list()` 应有 14 条 `superpowers`。

**Q：`pnpm install` 时 registry 是 `npmmirror` 有影响吗？**

A：对 GitHub 直装无影响（走 git）。仅 `npm publish` / `npm view --registry https://registry.npmjs.org` 需直连官方源。

**Q：如何更新/卸载？**

A：`dsh plugin --profile web add dsh-superpower@6.3.0.2`（更新）/ `dsh plugin --profile web remove dsh-superpower`（卸载）。每个 profile 独立。

## 贡献

欢迎提交 Issue / PR：

1. Fork 本仓库，基于 `main` 新建分支（`feat/*` / `fix/*` / `chore/sync-upstream-v*`）
2. 遵循 `writing-skills` 的编写与测试规范
3. `pnpm build && pnpm typecheck && node scripts/verify.mjs` 全绿后再提交
4. 说明关联的上游版本与改动范围

详见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 更新日志

见 [`CHANGELOG.md`](./CHANGELOG.md)（含上游 `v6.3.0` 汇总与本包 `dsh.N` 演进）。

## 协议

MIT，与上游 [obra/superpowers](https://github.com/obra/superpowers) 保持一致。见 [`LICENSE`](./LICENSE)。

## 致谢

- 上游作者 [Jesse Vincent](https://blog.fsck.com) 与 [Prime Radiant](https://primeradiant.com)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 `dsh-skill` 三角色架构
- 所有提交 Issue / PR 与提供反馈的贡献者
