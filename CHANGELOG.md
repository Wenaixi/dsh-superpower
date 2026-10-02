# 更新日志

本文件记录 `dsh-superpower` 的所有值得关注的变更。**v6.3.1 起本仓库脱离上游 [obra/superpowers](https://github.com/obra/superpowers) 独立演进**；**v7.0.0 起回归上游命名并整批同步上游 v6.4.2**（技能名去掉 `superpower-` 前缀，与上游保持一致）。同步上游新特性时按需 cherry-pick 并记录于此。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [7.1.1] - 2026-10-02

### 修复

- **`scripts/check-same-name-priority-fs.mjs` 在 pnpm isolated 布局下无法定位官方 provider（实测脚本失效）**：脚本原先只在 `~/.dsh/profiles/{web,default}/node_modules` 下查找 `@deepseek-ai/dsh-skill-filesystem`。DSH 官方推荐 `nodeLinker: isolated`，该包并非 profile 的直接依赖，只存在于 dsh 安装本体的依赖树中，故查找必然落空并抛「未在本机 DSH profiles 下找到」。本版将候选路径扩展为三类并补上兜底扫描：profile 入口（符号链接）→ pnpm store 内 `.pnpm/@deepseek-ai+dsh-skill-filesystem@*` 真实目录（通配扫描，peer 后缀形态）→ 全局 dsh 本体（`AppData/Roaming/npm/node_modules/@deepseek-ai/dsh`）。查找失败时的错误信息改为列出全部已尝试路径，并指引改用等价验证脚本 `check-same-name-priority.mjs`（自研桩对照）。修复后官方 filesystem 同层实测由「抛错无法运行」转为 4/4 PASS，「本插件同名技能优先级最高」这一承诺恢复为可运行证据。

## [7.1.0] - 2026-10-02

### 新增

- **提炼 `SkillCatalog` 深度模块**（`src/catalog.ts`）：封装技能目录扫描、mtime 变更探测、不可变快照复用（0 额外 I/O）、热重读自愈回写与名称漂移校验；对外仅暴露 `listCandidates` / `getDefinition` / `verifySpecification()` 三个高阶接口。
- **提炼 `SkillDocument` 深度模块**（`src/document.ts`）：封装 UTF-8 BOM 消除、CRLF 归一化、YAML frontmatter 解析、调用策略校验与 `toCandidate` / `toDefinition` 契约转换，内建纯内存 `selfTest()` 边界测试表面。
- **提炼 `SkillPriorityHarness` 测试基座**（`scripts/lib/harness-common.mjs`）：统一编排真实 Cordis 上下文隔离、正反顺序注册生命周期与胜出判定，两个同名裁决实测脚本借此精简超 40% 样板代码。
- **收敛上游同步复核为统一命令行总线**（`scripts/review-sync.mjs`）：原 `review-sync-deep.mjs` / `-tokens.mjs` / `-fences.mjs` 三个碎片脚本转为轻量代理，`node scripts/review-sync.mjs` 一键完成双绿核查，100% 保持既有调用兼容。
- **边界自检深度下沉至模块自身**：`SkillDocument.selfTest()` 与 `SkillCatalog.verifySpecification()` 使规范校验成为导出接口的一部分，`scripts/verify.mjs` 彻底纯化为声明式调度器，消灭外部临时目录与脚手架接缝。
- **扩充伴生脚本健壮性自检**：全仓 10 个伴生脚本纳入跨平台 Shebang 与 LF 行尾健壮性检查。

### 修复

- **发布流水线幂等保护**（`release.yml`）：tag 重推或 workflow 重跑时，`npm view` 命中已发布版本即跳过 publish，避免假红。显式指定 `--registry https://registry.npmjs.org`，修复 runner 镜像覆盖导致的 publish 静默失败。

### 实机验证

- 在 `sp-deep-verify` profile 中完成真实解压安装验证：15 技能全部经 `SkillRegistry` 发现与注册（provider 均为 `superpowers`，rank 裁决胜出）；15 技能全部经 `ctx.skills.get()` 完整提取正文与 frontmatter；`SkillCatalog.verifySpecification()` 在安装环境 8/8 自检全绿；安装产物 88 文件全树扫描零非 DSH 平台残留。

## [7.0.1] - 2026-10-02

### 修复

- **重新发布干净 tarball（修复 npm 7.0.0 残留非 DSH 文件）**：`v7.0.0` tag 早于平台专属化改造（`736f443`），其 npm tarball 仍携带 `using-superpowers/references/codex-tools.md` 与 `writing-skills/examples/CLAUDE_MD_TESTING.md`（安装后存在非 DSH 平台痕迹）。本版为专属化落地后的干净产物（本地深度验证：88 文件、15 技能、无平台残留），升 patch 版重发；`7.0.0` 因 npm 禁止 unpublish 保留在 registry，已通过 `npm deprecate` 标注废弃。发布后官方源 `latest` 已指向 `7.0.1`（`registry.yarnpkg.com` / fresh cache 均确认），国内镜像缓存同步延迟属正常现象。
- **本地 DSH 实机深度验证**：新建 `sp-deep-verify` profile（bundles: dsh-base + dsh-headless + 本插件），`headless` 真实会话逐技能调用 `skill` 工具加载全部 15 个技能，frontmatter description 与 `##` 标题与仓库逐一断言一致；安装产物全树扫描无平台残留（除 README 中"已移除"声明）。



### 破坏性变更

- **平台专属化：仅支持 DSH (DeepSeek Harness)**：移除全部非 DSH 平台（Claude Code、Codex、Gemini CLI、Hermes、Muse、Pi、Antigravity、Copilot CLI）的参考文档与兼容层。删除 `using-superpowers/references/` 下 7 个非 DSH 工具映射文件（`claude-code-tools.md`、`codex-tools.md`、`gemini-tools.md`、`hermes-tools.md`、`muse-tools.md`、`pi-tools.md`、`antigravity-tools.md`）、`writing-skills/anthropic-best-practices.md` 与 `writing-skills/examples/CLAUDE_MD_TESTING.md`；技能正文的平台适配小节固化为 DSH 原生工具规范；随包脚本（`brainstorming/scripts/server.cjs`、`start-server.sh`）移除 Codex/Claude Code 探测分支；契约门禁（`HOST_DOCS`、豁免清单）与上游同步复核引擎（新增 `NON_DSH_PLATFORM_REFS` 豁免集合）同步专属化，上游复核不再因缺失报错。
- **技能名与目录去掉 `superpower-` 前缀**：14 个技能回归上游原名（`brainstorming`、`executing-plans`、`subagent-driven-development` …），`frontmatter.name`、目录名、全部正文引用同步更新。旧名 `skill("superpower-writing-plans")` 不再可用，改用 `skill("writing-plans")`。语义化版本因破坏性变更升为 `7.0.0`。
- **同名技能优先级反转（本插件优先级最高）**：官方注册表同层重名按 `rank → 提供方顺序 → 本地顺序` 裁决，**rank 越小优先级越高**；本包 `SUPERPOWERS_RANK` 由 `550` 改为 `10`，小于 `dsh-skill-filesystem` 的项目/用户根（100~500）与官方内置 bundled（600），因此任何与本包同名的本地技能（`~/.dsh/skills`、项目 `.dsh/skills`、自定义根）或官方 bundled 技能均不会覆盖本包——本插件技能唯一生效。
- **全文符号清除 + 核心术语回英文**：全部 15 个技能的译文正文与辅助文档中的图形状态符号（对勾、叉号、警示三角等）替换为 ASCII 标记（`[OK]`/`[FAIL]`/`[WARN]`），文档不再包含任何 emoji；核心专业术语回英文原词（`subagent`/`agent`、`reviewer`/`re-reviewer`、`ledger`、`finding`、`brief`、`workspace`/`worktree`、`harness`、`human partner`），句子仍为简体中文。
- **frontmatter `description` 统一加前缀**：15 个 `SKILL.md` 的 `description` 开头统一为 `Superpower Skill：…`，简洁标明技能来源；技能优先级语义由 `SUPERPOWERS_RANK = 10` 保证，不写入描述文案。

### 新增

- **同步上游 v6.4.2 内容**（上游基准 v6.3.0 → v6.4.2）：
  - 新增技能 `diagnosing-superpowers`（20 个文件）：会话出问题后定位根因、以 `path:line` 证据报告;含 `references/session-discovery.md` 的 DSH 会话日志定位增补。
  - `writing-plans`：改写为记录决策而非代码转写（"What a Step Contains" 取代 "No Placeholders"）、步骤粒度改"一项可校验结果的动作"、新增 Review Focus 段与用户复核计划关卡；删除上游已废弃的 `plan-document-reviewer-prompt.md`。
  - `executing-plans`：重建为 Native（内联）执行模式，连续执行至整仓完成再一次性全分支评审，配套新增 `scripts/task-start` / `scripts/task-done`。
  - `brainstorming`：先澄清"为什么想要这东西"再提方案，批准绑定设计阶段。
  - `requesting-code-review` / `code-reviewer.md`：BASE_SHA 改用 `git merge-base origin/main HEAD`，reviewer 按"合理用户预期"判断规格未提及行为，新增 Declined to judge 清单。
  - `test-driven-development`：green 定义改为"项目自己的全套测试命令"，按名报告全部失败。
  - `subagent-driven-development`：同名 plan 独立工作区；`review-package` 对空/非后代 `BASE..HEAD` 区间拒绝（exit 3）；控制器可嵌套一层运行。
  - `using-superpowers`：新增 `references/muse-tools.md` 与 `references/claude-code-tools.md`，保留 DSH 专属 `dsh-tools.md`。
- **依赖升级**：devDependencies `@deepseek-ai/dsh-skill` 升到 `0.2.0-rc.2`（与 dsh 0.2.0-rc.2 内嵌版本对齐）、`@deepseek-ai/cordis` 固定 `4.0.4`；peerDependencies 的 dsh-skill 范围改为 `>=0.1.0-rc.1 <0.3.0-0`，实测命中 0.1.0-rc.8 / 0.1.1-rc.2 / 0.1.7-rc.2 / 0.2.0-rc.x，dsh 0.2.0 系安装不再需要版本豁免。

### 修复

- **`scripts/verify.mjs` 期望技能数 14 → 15**，并新增"技能正文相对路径引用存在性"检查，杜绝执行时死链。
- **新增 `scripts/check-same-name-priority.mjs` 自检**：用真实 `SkillRegistry` 验证同名优先级（仅有本包 / 叠加 rank 100/300/500/600 同名技能均不抢 / rank 0 可抢 / 逐名裁决），把"本插件优先级最高"从文档承诺变成可运行证据。
- **新增 `scripts/check-same-name-priority-fs.mjs` 同层实测**：直接加载官方 `@deepseek-ai/dsh-skill-filesystem`，在同一个 `SkillRegistry` 内验证 rank 裁决（自定义根 rank 300 同名不抢本包 rank 10、注册顺序颠倒结果不变、无覆盖时本包全可见），8/8 PASS；测试技能写系统临时目录并整棵删除，不触碰真实用户/项目技能根。
- **修正 `dsh.10` 条目过时陈述**：当时的 peer 范围实测仅命中 0.0.1-rc.1 与 0.1.0-rc.8 两个真实版本（CHANGELOG 原文"6 个真实版本全部命中"不准确）。

## [6.3.1] - 2026-08-23

### 变更

- **脱离上游独立演进**：本仓库从 `-dsh.N` 预发布线转为正式版本线，首个正式版 `v6.3.1`。上游基准锁定 `v6.3.0`，后续同步上游变更时以 cherry-pick 方式合入并记录。

### 修复

- **审查修正技能名引用与文档一致性**（commit `770f7aa`）：
  - `README.md` 技能表 `superpower-requesting` 补全为 `superpower-requesting-code-review`
  - `hermes-tools.md` / `codex-tools.md` / `dsh-tools.md` 技能名统一加 `superpower-` 前缀（`skill_view("superpower-...")`）
  - `brainstorming` / `subagent-driven-development` 正文与流程图技能名引用带前缀
  - `executing-plans` 声明台词中文化
  - `task-reviewer-prompt.md` / `re-review-prompt.md` 的 model 注释中文化（与 `implementer-prompt.md` 一致）
  - `CONTRIBUTING.md` 目录名同步策略更新为 dsh.9 后口径，移除 AI 味尾句
  - `CHANGELOG.md` 补 `dsh.9` / `dsh.10` release 链接
  - `release.yml` dist-tag 正则去基线硬编码（`-dsh\.[0-9]+$`）
  - `verify.mjs` 注释同步现状

## [6.3.0-dsh.10] - 2026-08-23

### 修复

- **`@deepseek-ai/dsh-skill` peer 范围改为显式预发布分支**：原 `^0.1.1-rc.2` 按 node-semver 规则只会放行 `0.1.1-rc.2` 一个版本，`0.1.0-rc.x` 等既有 harness 预发布构建会被静默排除，用户安装时触发 `ERESOLVE`。按 awesome-dsh-plugin 投稿规范推荐写法改为 `>=0.0.1-rc.1 <0.1.0 || >=0.1.0-rc.1 <0.2.0-0`，覆盖 `0.0.1-rc.x` 与 `0.1.x` 全系列预发布与正式版，消除误伤。**（注：v7.0.0 已改为 `>=0.1.0-rc.1 <0.3.0-0` 覆盖 0.2.x，见 7.0.0 段。）**

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

> **BREAKING CHANGE**：本次发版将 14 个技能的 `frontmatter.name` 统一加上 `superpower-` 前缀。
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
- **Subagent-Driven Development**：控制器不再因非灾难性分歧阻塞；冲突预检写入 ledger；同构小任务批量派发；实现者/reviewer 禁止再派生子 subagent；计划携带 `Spec:` 指针
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

[6.3.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.1
[6.3.0-dsh.10]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.10
[6.3.0-dsh.9]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.9
[6.3.0-dsh.8]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.8
[6.3.0-dsh.7]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.7
[6.3.0-dsh.6]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.6
[6.3.0-dsh.5]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.5
[6.3.0-dsh.4]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.4
[6.3.0-dsh.3]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.3
[6.3.0-dsh.2]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.2
[6.3.0-dsh.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.1
[6.3.0-dsh.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.0