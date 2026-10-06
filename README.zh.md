# dsh-superpower

[English](./README.md) | [中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/@wenaixi%2Fdsh-superpower?label=npm)](https://www.npmjs.com/package/@wenaixi/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)
[![Node](https://img.shields.io/badge/node-%3E%3D20-5FA04E)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D11-F69220)](https://pnpm.io)

<img src="./icon.png" alt="@wenaixi/dsh-superpower" width="128" height="128">

[obra/superpowers](https://github.com/obra/superpowers) 的 DSH 移植版。15 个技能注入 `ctx.skills`，装上就能用；技能正文是上游英文原版，面板可切换每个技能名称与描述的中英文。

## 安装

需要 dsh 本体（`npm i -g @deepseek-ai/dsh`），Node 与 pnpm 的版本要求见上方徽章。下面以 `web` profile 为例，换个 profile 名字即可。

```bash
# A — npm（推荐，自动装最新）
dsh plugin --profile web add @wenaixi/dsh-superpower

# B — GitHub 直装（绕过镜像延迟）
dsh plugin --profile web add github:Wenaixi/dsh-superpower

# 验证
dsh --profile web --dump-config | grep -A2 "@wenaixi/dsh-superpower"
# # == @wenaixi/dsh-superpower / - id: superpowers

dsh --profile web  # 进会话，技能自动可用
```

要锁版本就在包名后加 `@<version>`（`@wenaixi/dsh-superpower@7.2.0`）或 `#v7.2.0`。

旧包名 `dsh-superpower`（不带 scope）已经废弃并 `npm deprecate`，请换成带 scope 的。

本地开发或离线安装：

```bash
git clone https://github.com/Wenaixi/dsh-superpower && cd dsh-superpower
pnpm install && pnpm build && node scripts/verify.mjs   # 15/15 PASS
dsh plugin --profile web add ./                           # 本地路径安装
pnpm pack && dsh plugin --profile web add ./wenaixi-dsh-superpower-*.tgz

# 更新 / 卸载
dsh plugin --profile web add @wenaixi/dsh-superpower
dsh plugin --profile web remove @wenaixi/dsh-superpower
```

## 是什么

一套强制的工程方法论，模型不按顺序走就会做错：先设计，再把计划切成可校验的小步，然后测试驱动，调试时先找根因，收尾前必须跑验证命令。装在 `dsh.bundle` 里，不往用户目录里写东西，卸载干净，HMR 会自动重建。

## 包含技能

| 技能 | 什么时候用 |
|---|---|
| `using-superpowers` | 每次会话开头，先查有没有该用的技能 |
| `brainstorming` | 新功能动手前，把需求和设计问清楚 |
| `writing-plans` | 设计定了，拆成一项一项能验证的任务 |
| `using-git-worktrees` | 需要和当前工作区隔离 |
| `executing-plans` | 在当前会话里亲自把计划跑完 |
| `subagent-driven-development` | 计划里有多件独立的事，交给 subagent 分头做 |
| `dispatching-parallel-agents` | 两件以上互不依赖的事并行分发 |
| `test-driven-development` | 先写测试再写实现 |
| `systematic-debugging` | 出了 bug，先定位根因再改 |
| `verification-before-completion` | 说「完成」之前必须跑验证命令 |
| `requesting-code-review` | 任务做完、发 PR 前求评审 |
| `receiving-code-review` | 收到评审意见，先技术核实再改 |
| `diagnosing-superpowers` | 会话出问题或成本异常时定位原因 |
| `finishing-a-development-branch` | 决定合并、发 PR 还是留着分支 |
| `writing-skills` | 新建或改技能 |

工具映射（`Bash` 到 `pwsh`、`Read/Write` 到 `fs` 等）在 `skills/using-superpowers/references/dsh-tools.md`。

### 同名技能谁生效

官方注册表在同层重名时按 `rank` 从小到大裁决。本包 rank 是 10，比 `dsh-skill-filesystem` 的项目级和用户级（100–500）以及官方内置 bundled（600）都小，所以只要有同名技能，本包这份生效，不会有两套规则打架。

## 技能开关

插件管理页里点开 `@wenaixi/dsh-superpower` 卡片，详情页底部就是开关面板。每个技能一个开关，关掉即两侧同时不可见：

- 模型不再在可用技能目录里看到它，`skill` 工具调用也会被拒；
- 你也没法再从斜杠命令补全或命令行技能清单里调它。

面板上方还有全部开启、全部关闭、恢复默认三个批量操作和一个搜索框。页头标着本包的 `provider`、`rank`、`source`，排查同名覆盖时用得上。

- 拨动后立即生效，模型的下一轮对话就能看到新目录；当前这一轮不受影响。
- 状态写在 profile 的 `cordis.patch.yml` 的 `disabled` 字段里，跟着 profile 一起备份迁移，重装插件不丢。
- 只影响本包这 15 个技能，不碰官方和第三方插件提供的技能。
- 语言切换：面板顶部（说明文案之下）一个「中文 / English」按钮，一次切换全部 15 个技能的名称与描述显示语言（英文 `description` 与中文 `description_zh`）。正文一律为英文原版。两种描述分别以 `Superpower Skill: ` / `Superpower Skill：` 开头。未在面板调过语言时，描述跟随宿主界面语言（设置里选的语言）；调过后固定为该语言。
- 面板 UI 文案（标题、按钮、提示、meta 标签）跟随宿主界面语言（设置里切换语言即生效）。

7.3.0 及更早版本用过两个开关（模型可调用 / 用户可调用），对应 `modelDisabled` 与 `userDisabled` 两张表。这两个字段已废弃：升级后旧值继续生效，你第一次拨动开关时它们会被清空，配置收敛到 `disabled` 一张表。

## 使用

```
「帮我做 XXX」  → brainstorming → writing-plans → subagent-driven-development
「修这个缺陷」  → systematic-debugging
「帮我评审」    → requesting-code-review
「刚才会话出问题了」 → diagnosing-superpowers
```

校验：`await ctx.skills.list({cwd})` 应该返回 15 条 `provider: superpowers`。

## 开发

```bash
pnpm install && pnpm build && pnpm typecheck && node scripts/verify.mjs

# 同名优先实测一：自研桩对照，无外部依赖，任何环境可跑
node scripts/check-same-name-priority.mjs

# 同名优先实测二：加载官方 @deepseek-ai/dsh-skill-filesystem 做同层实测
#   该包不在 profile 的直接依赖里，脚本会依次尝试 profile 入口、pnpm store
#   内 .pnpm 真实目录、全局 dsh 本体三处候选路径。
#   本机没装 dsh（比如纯 CI）就用上面的自研桩脚本做等价验证。
node scripts/check-same-name-priority-fs.mjs

# 技能开关端到端实测：真实 SkillRegistry 上验证默认全开、禁言生效、热失效闭环
node scripts/check-skill-switches.mjs

# 上游同步全量复核（deep + tokens 双绿）
node scripts/review-sync.mjs

dsh --profile web --dump-config  # 断言 "# == @wenaixi/dsh-superpower"
```

### 浏览器端验证

可选，需要本机装好 dsh 和 Python 的 playwright。两个脚本只做验证，地址和路径都从命令行传：

| 脚本 | 验什么 |
|---|---|
| `scripts/browser/verify-switch-ui.py` | 真机 Web UI 里点开插件卡片，逐个拨开关、点批量按钮、搜索过滤，再回读 `cordis.patch.yml` 确认落盘 |
| `scripts/browser/verify-model-perception.py` | 四阶段闭环：UI 写完用宿主真实 `SkillRegistry` 复核两侧可见性，并逐行比对 UI 显示与宿主目录 |

```bash
# 1. 起一个装了本插件的 profile 的 Web 服务，记下启动日志里的 token
dsh --profile <profile> --no-open --port 3199

# 2. 面板全量操作
python scripts/browser/verify-switch-ui.py \
  http://127.0.0.1:3199 <token> .verify-shots <profile>/cordis.patch.yml .verify-shots/expected.json

# 3. UI 与宿主的四阶段闭环
python scripts/browser/verify-model-perception.py \
  http://127.0.0.1:3199 <token> <profile 目录> <profile>/cordis.patch.yml .verify-shots
```

`expected.json` 是 15 个技能名的数组，用来断言 UI 行序和 `skills/` 目录一致：

```bash
node -e "import('./lib/superpowers.js').then(async m=>{const c=await m.SkillCatalog.fromDirectory('skills');require('fs').writeFileSync('expected.json',JSON.stringify(c.verifyIntegrity().entries.map(e=>e.document.name)))})"
```

截图落在 `.verify-shots/`，已在 `.gitignore` 里。

## 目录

```
src/superpowers.ts  # 插件入口，SkillProvider rank 10
src/catalog.ts      # SkillCatalog：技能编目、三键聚合指纹探测、快照复用、规范自检
src/document.ts     # SkillDocument：frontmatter 解析、契约转换、内建 selfTest
src/switches.ts     # 技能开关：禁言表解包与 invocation 覆盖，内建 selfTest
src/client.js       # 浏览器半侧：插件卡片详情页的单开关面板，手写 CJS factory
skills/             # 15 个技能正文与资源
lib/                # 已提交的构建产物，GitHub 直装免构建
locale/             # 插件卡片的标题与描述（中英）；面板 UI 经官方 locale 注册表双语切换
icon.png            # 插件卡片、README 顶部、GitHub 头像共用
scripts/            # 门禁、同名裁决实测、开关实测、上游同步复核、浏览器验证
scripts/build-client.mjs      # 复制客户端产物后校验内联清单与 skills/ 目录一致
```

## 更新日志

版本沿革与逐版变更记录在 [CHANGELOG.md](./CHANGELOG.md)，新版本在前，每个版本一段。

## 常见问题

**装完 404 或者版本不对？** 换 GitHub 形式安装，或者加 `--registry https://registry.npmjs.org` 走官方源。不需要配置白名单。查最新版本用 `npm view @wenaixi/dsh-superpower --registry https://registry.npmjs.org`。

**卡片标题、描述或图标是空的？** 根因通常是 `package.json` 的 `exports` 没放行 `./package.json` 和 `./locale/*.json`，或者 `icon` 指向了包外的绝对路径。`node scripts/verify.mjs` 会把这两类问题连同 `files` 是否放行图标一起断言掉。

## 协议

MIT，详见 [LICENSE](./LICENSE)。

## 贡献

Issue 和 PR 都欢迎。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 致谢

- 上游 [obra/superpowers](https://github.com/obra/superpowers)，作者 [Jesse Vincent](https://blog.fsck.com) 与 [Prime Radiant](https://primeradiant.com)，同为 MIT 协议
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的三角色插件架构
