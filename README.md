# dsh-superpower

[![npm](https://img.shields.io/npm/v/@wenaixi%2Fdsh-superpower?label=npm)](https://www.npmjs.com/package/@wenaixi/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)

[obra/superpowers](https://github.com/obra/superpowers) 的 DSH 专属移植版 — 15 个技能注入 `ctx.skills`，开箱即用，全中文，**仅支持 DSH (DeepSeek Harness) 平台**，不提供其它 AI 宿主适配。

## 安装

> 以主工作台 `web` 为例，其它 profile 改 `--profile` 后名字即可。均走 `dsh.bundle`，零构建、零白名单。

> **前置**：`Node >=20`、`pnpm >=11`、`dsh`（`npm i -g @deepseek-ai/dsh`）。
>
> pnpm 版本说明：DSH 官方设计面向 pnpm 11+（`nodeLinker: isolated` 符号链接隔离 +
> `allowBuilds` 构建审批）。pnpm 10.x 在规模较大的 profile 上处理依赖图时会触发
> `FATAL ERROR: invalid array length` 而崩溃（与机器内存无关，8 GB 堆仍崩），
> 遇到该报错请先升级 pnpm。

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

> 如需锁定版本，在包名后追加 `@<version>`（如 `@wenaixi/dsh-superpower@7.0.1`）或 `#v7.0.1`（GitHub 形式）。
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

## 技能开关

在 DSH Web GUI 插件管理页中打开 `@wenaixi/dsh-superpower` 卡片的详情页，本包 15 个技能各有两个开关：

| 开关 | 关闭后 |
|---|---|
| 模型可调用 | 该技能不再进入模型的可用技能目录，`skill` 工具调用也会被拒绝 |
| 用户可调用 | 该技能不再出现在斜杠命令补全与命令行技能清单中 |

面板还提供全部开启、全部关闭、恢复默认三个批量操作，以及按名称或描述过滤的搜索框。页头标注了本包的 `provider`、`rank` 与 `source`，便于排查同名覆盖。三个批量按钮都作用于**两侧**：全部关闭会让这 15 个技能既不被模型看到、也不能由用户手动调用。

- **立即生效**：拨动后宿主刷新技能目录，模型的下一轮对话即可看到新的可用技能；当前进行中的这一轮不受影响。
- **落盘位置**：profile 的 `cordis.patch.yml`，随 profile 一起被备份与迁移，重装插件不丢状态。
- **作用域**：只影响本包的 15 个技能，不触碰官方或第三方插件提供的技能。

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

# 同名优先实测一：自研桩对照（无外部依赖，任何环境可跑）
node scripts/check-same-name-priority.mjs

# 同名优先实测二：加载官方 @deepseek-ai/dsh-skill-filesystem 做同层实测
#   该包不在 profile 的直接依赖里，脚本会依次尝试 profile 入口、pnpm store
#   内 .pnpm 真实目录、全局 dsh 本体三处候选路径。
#   若本机确实没有 dsh（如纯 CI 环境），用上面的自研桩脚本完成等价验证。
node scripts/check-same-name-priority-fs.mjs

# 技能开关端到端实测（真实 SkillRegistry：默认全开 / 禁言生效 / 热失效闭环）
node scripts/check-skill-switches.mjs

# 上游同步全量复核（deep + tokens 双绿）
node scripts/review-sync.mjs

dsh --profile web --dump-config  # 断言 "# == @wenaixi/dsh-superpower"
```

### 浏览器端验证（可选，需本机 dsh 与 Python playwright）

两个脚本只做验证、不依赖仓库产物，全部路径与地址从命令行传入：

| 脚本 | 验证内容 |
|---|---|
| `scripts/browser/verify-switch-ui.py` | 真机 Web UI 里点开插件卡片详情页，逐个拨开关、点三个批量按钮、搜索过滤，并回读 `cordis.patch.yml` 确认落盘 |
| `scripts/browser/verify-model-perception.py` | 四阶段闭环：UI 写入后用宿主真实 `SkillRegistry` 复核两侧可见性，并逐行比对 UI 显示与宿主目录 |

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

> `expected.json` 是 15 个技能名的数组，用于断言 UI 行序与 `skills/` 目录一致：
> `node -e "import('./lib/superpowers.js').then(async m=>{const c=await m.SkillCatalog.fromDirectory('skills');require('fs').writeFileSync('expected.json',JSON.stringify(c.verifyIntegrity().entries.map(e=>e.document.name)))})"`。
>
> 截图落在 `.verify-shots/`（已在 `.gitignore` 中）。

## 目录

```
src/superpowers.ts  # 插件入口与 SkillProvider rank 10（同名词条本包胜出）
src/catalog.ts      # SkillCatalog：技能编目、mtime 探测、快照复用、规范自检
src/document.ts     # SkillDocument：frontmatter 解析、契约转换、内建 selfTest
src/switches.ts     # 技能开关状态：禁言表解包与 invocation 覆盖，内建 selfTest
src/client.js       # 浏览器半侧：插件卡片详情页的技能开关面板（手写 CJS factory）
skills/             # 15 技能（v7.0.0 起无 superpower- 前缀）
lib/                # 已提交的构建产物，GitHub 直装零构建
scripts/            # verify 门禁、同名裁决实测、开关实测、上游同步复核
scripts/build-client.mjs      # 复制客户端产物前校验内联清单与 skills/ 目录一致
```

版本：`v7.0.0` 起技能名回归上游命名（无 `superpower-` 前缀）并整批同步上游 `obra/superpowers v6.4.2`；本插件技能优先级最高（rank 10），同名技能本包胜出。`v7.0.0` 起本插件为 **DSH 专属**，已移除全部非 DSH 平台（Claude Code、Codex、Gemini CLI、Hermes、Muse、Pi、Antigravity、Copilot CLI）的参考文档与兼容层；`v7.0.1` 为修复版，重发干净 tarball（npm `7.0.0` 发布于专属化前、已废弃，勿使用）。详见 `CHANGELOG.md`。

`v7.1.0` 起深化深模块架构：新增 `SkillCatalog`（编目/快照/规范自检）与 `SkillDocument`
（文档解析/契约转换）两个深度模块，边界自检下沉至模块自身；同名裁决实测脚本共用
`SkillPriorityHarness` 基座并精简超 40% 样板代码；上游同步复核收敛为统一的
`scripts/review-sync.mjs` 命令行总线。
`v7.1.1` 修复官方 filesystem 同名实测脚本在 pnpm isolated 布局下无法定位
`@deepseek-ai/dsh-skill-filesystem` 的问题（候选路径扩展至 pnpm store 与全局 dsh 本体）。
`v7.2.0` 新增技能开关面板：本包升级为双面插件，在插件卡片详情页为 15 个技能各提供
「模型可调用 / 用户可调用」两个开关，状态落在 profile 配置的 volatile 字段里并立即生效。

## 常见问题

404/镜像延迟请改用 GitHub 形式或 `--registry https://registry.npmjs.org`（官方源已是最新）；白名单不需要；`latest` 可用 `npm view @wenaixi/dsh-superpower --registry https://registry.npmjs.org` 查看。

## 协议

MIT，与上游 [obra/superpowers](https://github.com/obra/superpowers) 保持一致。详见 [`LICENSE`](./LICENSE)。

## 贡献

欢迎提交 Issue / PR。详见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 致谢

- 上游作者 [Jesse Vincent](https://blog.fsck.com) 与 [Prime Radiant](https://primeradiant.com)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 `dsh-skill` 三角色架构