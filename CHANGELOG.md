# 更新日志

本文件记录 `dsh-superpower` 的所有值得关注的变更。主版本与上游 [obra/superpowers](https://github.com/obra/superpowers) 严格同步，`-dsh.N` 为本仓库在基线 `6.3.0` 上的预发布演进位。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [6.3.0-dsh.9] - 2026-08-23

### 修复

- **硬把 `skills/` 目录重命名为 `superpower-` 前缀**：前几版仅改了 `SKILL.md#frontmatter.name` 为 `superpower-<kebab>`，目录仍为原 `<kebab>`（依赖 Provider 的“frontmatter 优先于目录名并 warn”逻辑）。本次把 14 个目录从 `skills/<kebab>` 硬重命名为 `skills/superpower-<kebab>`，使 `entry.name === frontmatter.name` 完全一致，消除 `list()` 的 warn 与 `get()` 的 name drift 校验风险，确保 `skill("superpower-writing-plans")` 等调用在 DSH 启动快照与 HMR 缓存下均可稳定命中。同步更新 `README.md` / `scripts/verify.mjs` / `CLAUDE.md` 中残留的旧路径引用与校验逻辑，`pnpm pack` 产物同步改为 `skills/superpower-*`，`verify` 14/14 PASS。

## [6.3.0-dsh.8] - 2026-08-23

### 修复

- **`cordis.patch.yml` 加引号**：`name: @wenaixi/dsh-superpower` 未加引号导致 `dsh --dump-config` 报 `YAMLException: bad indentation of a mapping entry`（`@` 开头在 YAML plain scalar 中不合法）。改为 `name: "@wenaixi/dsh-superpower"`，与 `@wenaixi/dsh-ponytail` 保持一致。

## [6.3.0-dsh.7] - 2026-08-23

### 变更

- **npm 包名统一到 `@wenaixi/dsh-superpower`**：与 `@wenaixi/dsh-ponytail` / `@wenaixi/cfbridge` 保持一致的 `@wenaixi` scope。变更内容：`package.json#name` 由 `dsh-superpower` 改为 `@wenaixi/dsh-superpower` 并新增 `publishConfig: { access: "public" }`；`cordis.patch.yml` 的 `name` 同步改为 `@wenaixi/dsh-superpower`；`README.md` 安装/卸载/验证/常见问题、`release.yml` 的 `npm dist-tag add`、`src/superpowers.ts` 注释、`CONTRIBUTING.md` / `CLAUDE.md` 全量替换为 scoped 名；`pnpm pack` 产物由 `dsh-superpower-*.tgz` 改为 `wenaixi-dsh-superpower-*.tgz`。GitHub 仓库名 `Wenaixi/dsh-superpower` 不变（仅 npm 名变更）。

### 废弃

- 旧名 `dsh-superpower`（无 scope）已废弃：发版后执行 `npm deprecate dsh-superpower@"*" "已迁移至 @wenaixi/dsh-superpower，请改用 \"dsh plugin --profile web add @wenaixi/dsh-superpower\""`，后续不再向该名发布新版本。

## [6.3.0-dsh.6] - 2026-08-22

### 修复

- **npm `latest` dist-tag 站位问题**：当仓库历史 `6.3.0` 基础版被 unpublish 后，npm 的"没有 latest 时回退到最高 semver 版本"默认行为会让最新发的 `-dsh.N` 抢占 `latest`。本次发版在 `release.yml` 的"发布到 npm"之后新增"为 `-dsh.N` 系列打 `dsh` dist-tag"步骤，把 dsh 系列从 latest 抽离；本地同步把 `6.3.0-dsh.5` 显式补 `latest` tag（仓库策略上 dsh.N 为事实稳定演进线，详见 `CLAUDE.md` 第 10 章）。今后发版路径固定为：`npm publish` → 命中 `-dsh.N` → `npm dist-tag add <pkg>@<ver> dsh`，CI 自动完成。

### 文档

- `CLAUDE.md` 第 10 章新增"dist-tag 策略"段，明示：
  - 仓库策略上 `-dsh.N` 系列为事实稳定演进线
  - 显式打 `dsh` dist-tag 与 npm 默认 latest 抢占的应对
  - `release.yml` 对应变更说明
- `release.yml` 在"发布到 npm"后加"为 `-dsh.N` 系列打 dsh dist-tag"步骤

## [6.3.0-dsh.5] - 2026-08-22

> ⚠️ **BREAKING CHANGE**：本次发版将 14 个技能的 `frontmatter.name` 统一加上 `superpower-` 前缀。
> 从 `-dsh.4` 升级后，所有调用方式都必须更新：
>
> - 旧：`skill("brainstorming")` / `/skill brainstorming`
> - 新：`skill("superpower-brainstorming")` / `/skill superpower-brainstorming`
>
> 旧名不再注册，`ctx.skills.get("brainstorming")` 将返回 `undefined`。
> 详见本节下方"变更"条目与 `CONTRIBUTING.md`"上游同步策略"。

### 变更

- **14 个技能统一加 `superpower-` 前缀，与上游 `obra/superpowers` 永久脱钩**：
  14 个 `SKILL.md` 的 `frontmatter.name` 由原 `<kebab>` 改为 `superpower-<kebab>`
  （如 `brainstorming` → `superpower-brainstorming`）；目录名保持不变；
  Provider 代码不动（沿用既有的"frontmatter 优先于目录名"约定，会输出 warn 提示）；
  用户命令 `/skill superpower-brainstorming` 与模型调用 `skill("superpower-brainstorming")` 均能工作；
  上游同步策略详见 `CONTRIBUTING.md` 新增的"上游同步策略"节。

### 文档

- `skills/using-superpowers/references/dsh-tools.md` 与 `SKILL.md`：把 `superpowers:<name>` 示例改为 `superpower-<name>`
- 其它 `references/*.md` 与 14 个技能正文里引用旧名的位置同步替换（grep 全仓 `superpowers:` 残留为 0）
- `README.md` 技能清单表与示例调用同步更新
- `CONTRIBUTING.md` 新增"上游同步策略"节，明示脱钩代价与同步流程
- `scripts/verify.mjs` 适配 `frontmatter.name` 与目录名可偏离的场景（用 `~` 标记）

### 回滚

- 移除上一版未发布时尝试的"28 条别名 candidate"方案（DSH 上游 `isSkillName = /^[a-z0-9]+(-[a-z0-9]+)*$/` 拒绝冒号，前缀方案只能走 kebab-case 短横线）

## [6.3.0-dsh.4] - 2026-08-22

### 修复

- **CI（Release）**：修复 `release.yml` 中 CHANGELOG 提取正则的 `\z` 非法锚点（JS 中退化为字面量 `z`，含 `z` 的末版正文被截断），改为定位标题行后手动切片到下一 `## [`，并将输出路径改为 `RUNNER_TEMP` 避免并发覆盖
- **健壮性（`src/superpowers.ts`）**：`parseFrontmatter` 去 BOM；`list` 的 `readdir` 透传 `signal` 及时中断；`get` 增加 `locator` 守卫、`readFile` 透传 `signal`、`AbortError` 直抛、非 `ENOENT` 记 `warn`，并补全 `frontmatter`/名称漂移/`invocation` 非法等诊断；明确 `skills/change` 为 `emit` 模式无需 `next()` 的注释

## [6.3.0-dsh.3] - 2026-08-22

### 修复

- **规范对齐（`dsh-plugin-dev`）**：`src/superpowers.ts` 复用 `dsh-skill/isSkillName` 校验，移除本地正则；`Config` 的 `providerName` 改为必填（`Schemastery` 默认值仍在 schema），拒绝保留名 `runtime` 并补 `.description`；`Config` 接口与 schema 已对齐可选/必填
- **健壮性**：`list`/`get` 尊重 `options.signal` 并及时 `throwIfAborted()`；`list` 内对重复 `skill name` 去重并 `warn`；`stat` 失败记 `debug`、YAML 解析失败单独 `warn`；`parseSkillFile` 不再静默吞错；移除 `import.meta.url` 静默降级，改为显式失败（“失败要响亮”）
- **生命周期**：`apply` 改用单一 `ctx.effect` 包裹 `registerProvider` + `skills/change` 监听，卸载时按序清理，HMR 无残留
- **打包**：`package.json` 新增 `prepare` 脚本（与 `prepack` 并存），修复 `github:Wenaixi/dsh-superpower` 直装时无 `lib/` 构建的坑
- **文档**：同步 `CLAUDE.md`（技术栈/架构/目录/配置/注意事项/决策日志）与代码修复一致；明确 `lib/` 已提交

## [6.3.0-dsh.2] - 2026-08-22

### 修复

- **README**：所有安装示例默认主工作台由 demo 改为 web（dsh plugin --profile web add ...），并注明自动走 dsh.bundle 无需手动配置 cordis.patch.yml

## [6.3.0-dsh.1] - 2026-08-22

### 修复

- **npm 文档**：`README.md` 在 `6.3.0` 发布包中仍含“还没发布到 npm”等过时描述，本版已修正为 A(npm)/B(GitHub)/C(本地)/D(tarball) 四路径，并补充零白名单说明
- **构建**：`6.3.0` 已发布到 npm 官方源；因 npm 不允许同版本覆盖，后续文档等非功能修正改用 `-dsh.N` 预发布后缀递增

## [6.3.0-dsh.0] - 2026-08-12

### 同步上游 v6.3.0（初始移植版）

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

[6.3.0-dsh.8]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.8
[6.3.0-dsh.7]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.7
[6.3.0-dsh.6]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.6
[6.3.0-dsh.5]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.5
[6.3.0-dsh.4]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.4
[6.3.0-dsh.3]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.3
[6.3.0-dsh.2]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.2
[6.3.0-dsh.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.1
[6.3.0-dsh.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.0
