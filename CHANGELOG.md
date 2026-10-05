# 更新日志

v6.3.1 起脱离上游独立演进，v7.0.0 起回归上游命名并整批同步上游 v6.4.2。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [7.4.1] - 2026-10-06

### 修复

- **面板的每一次开关操作都报「保存失败」，配置零写入（真机实测发现）**：`dsh-settings` 的写入闸门逐条校验 `op.path` 是否落在某个 volatile 节点下，命中不了就抛 `Config field "modelDisabled" is not volatile` 并让整批 `mutate` 失败。7.4.0 把两个旧字段去掉 `.volatile()` 本意是「不再可写」，实际效果是它们变成非 volatile 节点，于是「主写入 `disabled` + 两条 `unset`」这一批里只要有 `unset` 指向旧字段就整批被拒。两个旧字段恢复 `.volatile()`：它们仍不会被面板写入（面板只发 `disabled` 与 `unset`），但能被 `unset` 合法清掉。

### 新增

- **面板 meta 区补「面板版本」标注**：浏览器侧读不到 `package.json`，界面却是判断「装的是哪一版、是不是这一版界面」的唯一现场。写死常量并在页头显示，版本与界面对不上时能一眼看出，不必翻产物。

## [7.4.0] - 2026-10-05

### 移除

- **brainstorming 随包可视化服务（端口、会话密钥、WebSocket 重连四套生命周期）**：`skills/brainstorming/scripts/` 整目录删除，含 `server.cjs`、`start-server.sh`、`stop-server.sh`、`helper.js`、`frame-template.html`。宿主 `documentPreviews` 已内置 `html`/`htm` 预览并渲染为隔离 iframe，插件无再自建端口。**能力降级**：预览中的点击不再回传给 agent，选择结果必须回到终端回复里；`visual-companion.md` 与 `SKILL.md` 均显式写入这一约束。

### 变更

- **每个技能从两个开关合并为一个**：原先「模型可调用 / 用户可调用」两个语义重叠的开关合并为单个开关，关闭即 `modelInvocable` 与 `userInvocable` 同时为 `false`。面板行布局由双列网格改为标签在左、单开关在右；词典的 `modelInvocable`/`userInvocable` 与两条 hint 合并为 `invocable`/`invocableHint`，批量按钮提示里的「两侧」措辞一并收敛。
- **开关状态收敛到单张禁言表**：新增 `disabled` volatile 字典作为唯一写入目标，`switchOps()` 把主写入与两条清理旧表的 `unset` 合进同一次 `mutate`——共享一个 revision 栅栏与一次持久化决策，不存在半迁移态。用户在面板做任何一次操作即完成收敛，之后 profile 只剩 `disabled` 一个字段。
- **端到端实测改为单字段语义**：`check-skill-switches.mjs` 重写为五场景（默认全开、新表两侧同关且不误伤他人、旧表并集生效、新表非空时旧表失效、热失效后目录立即刷新）；两个浏览器脚本的探针由双列 `modelOn`/`userOn` 改为单列 `on`，并新增「旧的两张分侧表已被清空」断言。
- **门禁覆盖两条新契约**：`checkCompanionScripts` 收缩为 `checkBundledShellScripts`（随包 JS 服务脚本已删除，只留 shell 脚本的 Shebang 与 CRLF 自检）；client-artifact 新增单开关断言；新增 `checkNoSelfHostedService` 断言技能正文不得出现 `start-server.sh` 等随包服务痕迹。三条均做过破坏实测。
- **修复客户端构建死锁**：`build-client.mjs` 原先在复制产物之前调用 `assertClientManifest`，而后者把「`src` 与 `lib` 内容一致」也作为失败条件，产物一旦落后于源就拒绝执行，于是永远无法重建。改为先复制再校验，并从 `client-manifest.mjs` 拆出 `checkSkillCatalogDrift` 专管清单漂移。

### 破坏性变更

- **配置字段 `modelDisabled` 与 `userDisabled` 废弃**：两者去掉 `volatile()` 后不再可写，面板只写 `disabled`。schema 声明刻意保留，否则 profile 里的旧键会被直接丢弃、用户历史开关一次性消失；`readSwitches` 在 `disabled` 为空时取两旧表的并集，保证升级前的开关在用户第一次操作前继续生效。手动改过 `cordis.patch.yml` 的用户需要把值并入 `disabled`。

### 修复

- **单开关面板的样式注入与词典遗漏已由门禁钉死**：新增断言拒绝 `spSwToggles` 双列类名残留、拒绝绕过 `LEGACY_FIELDS` 直接引用旧字段，并要求 `invocable`/`invocableHint` 在 zh/en 双语同时声明。破坏实测时该断言确实变红。
## [7.3.0] - 2026-10-04

### 修复

- **技能快照对「内容编辑」失明（长驻实例返回过期目录）**：`SkillCatalog` 的快照复用判据原来只有「技能根目录自身 mtime」一个键。编辑任意 `SKILL.md` 正文、目录结构不变时目录 mtime 不变，长驻进程（Web GUI 中的 provider 实例）静默提供过期目录与内容；「先建目录、稍后才写 SKILL.md」的增量新建场景同样完全不可见。现升级为三键聚合指纹——根目录 mtime + 根级技能目录名集合 + 各 `SKILL.md` 的 mtime——任一键变化即重扫，稳定场景仍是 1 次 stat + 1 次 readdir，不读文件内容。`selfTest()` 新增 4 条可失败用例（正文编辑重扫 / 增量新建可见 / 删除目录 / ok 计入缺失），边界自检 11/11 → 15/15，每条都做过破坏实测。
- **裸调用守卫分支一对 kebab 技能名全部逃逸**：契约自检补钉时揪出守卫正则分支一字符类写成 `[w-]+`，只能匹配字母 w 与连字符，真实 kebab 技能名（每段可含数字与多连字符）一个都匹配不到，带技能名前缀的裸脚本调用全部漏网。两处正则（自检样本与消费方）统一为 `[a-z0-9-]+`，自检补齐分支一两种形态、豁免集与消费方同源、tick-path 全前缀与 tick-bare 全扩展名。
- **客户端清单比对漏检「两侧同序全错」**：`client-manifest` 原按索引比对 `declared[i] vs disk[i]`，隐含两侧顺序一致假设；顺序差异被误报成内容差异，而两侧同时换序且内容全等时 0 报错。改为按技能名建 Map 比对，只报真实内容差异。
- **手写括号配平器零守卫陷阱**：`extractCatalogLiteral` 的配平扫描器单引号分支写成空串，字符串内方括号参与配平，纯靠「描述恰好无方括号」幸存。移除手写配平，改朴素边界 + `new Function` 求值双保险，求值失败即报错。
- **`verifyIntegrity().ok` 漏判缺失技能**：聚合 `ok` 原来只查重复、解析错误与名称漂移，目录在而 `SKILL.md` 缺失不计入失败，与门禁判定口径不一致。现补齐，并附一条可失败自检。

### 变更

- **技能总数魔法数收敛**：`15` 散落在 `verify.mjs` 与 `check-skill-switches.mjs` 四处，现导出为 `EXPECTED_SKILL_COUNT` 常量（`catalog.ts` 经 `superpowers.ts` 再导出），新增/删除技能只改一处。
- **`required` 存在性清单清理**：删除恒真项（`package.json` 自身）与 5 个技能路径（第 1 段 `missingSkillMd` 检查已覆盖），17 项收敛到 11 项。
- **frontmatter 边界契约注释钉死**：多 YAML 文档（frontmatter 内列 0 `---`）与 CRLF 单字符剥除的边界显式写入注释。
- **review-sync 返回契约统一**：移除 `typeof res === 'number'` 历史兼容分支，deep/tokens 统一返回 `{ ok }`，总线只判 ok 定退出码。
## [7.2.1] - 2026-10-04

### 修复

- **面板底部三个标注切语言不变（meta 区 i18n 补全）**：「技能开关」面板页头的 `provider` / `rank` / `source` 三个标签是硬编码英文，宿主界面语言切到中文时这三处仍是英文。现并入 `zh` / `en` 词典，改经官方 locale 注册表的 `t()` 席位取词，随界面语言整体切换。

### 变更

- **固化面板语言边界**：技能内容（名称与描述）固定中文，不做技能级 i18n；面板 UI 文案（标题、按钮、提示、meta 标签）全部双语。`locale/{en,zh}.json`（卡片元数据）与面板词典是两个独立通道，不合并。
- **门禁新增 UI i18n 取词断言（client-artifact 4.5 段）**：渲染路径禁止硬编码裸标签（`spSwMetaItem' }, 'xxx'` 匹配即红），三个 meta 键必须出现 `t('key')` 取词且 zh/en 双语同时声明。已用「退回硬编码」「删 en 键」两种破坏实测确认可红。

## [7.2.0] - 2026-10-03

### 修复

- **面板样式从未注入 DOM（真机实测发现）**：`src/client.js` 里定义了 `CSS` 常量、每个类名都写全了 `--dsw-*` 令牌，却没有任何代码把这段 CSS 塞进 `<head>`，类名等于没写，面板渲染出来是浏览器默认样式（16px 正文、无行高、无分隔线、元信息挤成一坨），而且不报任何错。现按官方契约注入 `style[data-plugin-css]` 标签，宿主卸载插件时一并回收。门禁补了三条断言：必须出现 `createElement('style')`、`head.appendChild` 与 `data-plugin-css` 标记，且禁止引用 `--dsw-static-*` 原始色板。已用「删掉注入」和「引入 static 色板」两种破坏实测，确认这三条会真的失败。
- **三个批量按钮只作用于单侧（真机实测发现）**：「全部关闭」只写 `modelDisabled`，「恢复默认」只清 `userDisabled`，跟按钮文案承诺的「两侧」对不上。「恢复默认」这条尤其隐蔽：它清的是本来就空的一侧，用户侧残值原样留着，而残值在 UI 上跟「已开启」长得一模一样，只能翻配置文件才发现。三个按钮现统一作用于两侧。顺带修正 `submit()` 的字段参数形态——批量路径改成数组，两个单开关调用点漏改，静默变成「把字符串丢给 `for...of`」，点击无报错、UI 不动、配置零写入。

### 新增

- **技能开关面板**：DSH Web GUI 插件管理页里 `@wenaixi/dsh-superpower` 卡片的详情页，本包 15 个技能各有两个开关。关掉模型侧，该技能不再进入模型的可用技能目录，`skill` 工具调用也被拒；关掉用户侧，它不再出现在斜杠命令补全与命令行技能清单里。面板另有全部开启 / 全部关闭 / 恢复默认三个批量操作（都同时作用于两侧）、按名称或描述过滤的搜索框，以及 `provider` / `rank` / `source` 三个只读标注供排查同名覆盖。配色、字阶、圆角全部取自 DSH 语义令牌，行分隔用 `.item + .item { border-top: 0.5px solid var(--dsw-alias-border-l2) }` 相邻兄弟选择器，布局照官方设置表单的字段排版（12px 上下留白、标签在左开关在右），深浅色随 `body[data-ds-dark-theme]` 自动切换。
- **本包升级为双面插件**：新增 `src/client.js`（手写 CJS factory，经 `scripts/build-client.mjs` 原样复制到 `lib/client.js`）、`exports["./client"]` 与 `dsh.client` 声明。纯终端 profile 不加载浏览器半侧，宿主侧行为不变。
- **图标与插件卡片元数据**：新增 `icon.png`（肌肉手臂实心剪影，配色沿用 DSH 官方插件图标的 `#67C7FE → #3F77D8` 渐变，浅色深色底都可读）作为 `package.json#icon`；新增 `locale/en.json` 与 `locale/zh.json` 提供卡片标题与描述的中英文本。这两者都需要 `exports` 放行 `./package.json` 与 `./locale/*.json`——漏了会导致卡片只剩包名，而 `dsh-app-boot` 的 `readPluginMeta` 把这类错误塞进 `meta.error` 后就吞掉，安装与启动日志都看不到。README 顶部与 GitHub 头像复用同一个 `icon.png`。
- **技能开关状态深度模块**（`src/switches.ts`）：封装两个以技能名为键的禁言表的 volatile 解包与 `SkillInvocationPolicy` 覆盖，内建 `selfTest()` 边界自检并随 `SkillCatalog.verifySpecification()` 进入质量门禁。
- **开关状态落进 profile 配置**：`Config` 新增 `modelDisabled` 与 `userDisabled` 两个 `volatile` 字典字段，写入 profile 的 `cordis.patch.yml`。开关经官方 `ctx.configForms` 通道读写，带乐观并发栅栏；宿主收到 `loader/volatile-update` 后刷新注册表缓存并广播 `skills/change`，模型侧下一轮即可看到新目录。技能仍保留在注册表中并继续占同名裁决权，与在 `SKILL.md` 写 `disable-model-invocation` 语义完全一致。
- **端到端实测脚本**（`scripts/check-skill-switches.mjs`）：在真实 `SkillRegistry` 上验证默认全开、禁言表生效且不误伤他人、运行中改开关后目录立即刷新三组断言，并接入 `pnpm verify`。
- **客户端静态清单漂移校验器**（`scripts/lib/client-manifest.mjs`）：构建时逐项比对 `src/client.js` 内联的技能清单与 `skills/` 目录的真实编目，名称、数量、顺序或描述任一不一致即构建失败，守住「`skills/` 是唯一事实来源」。
- **门禁扩充**：客户端产物检查（`node --check`、官方 CJS factory 形态、顶层无 ESM 语法、样式真注入且不引用 static 色板）、「客户端 `SETTINGS_NAMESPACE` 与 `cordis.patch.yml` 条目 id 逐字一致」、以及图标与卡片元数据契约（icon 必须包内相对路径、格式合法、上限 256 KiB、`files` 已放行，`exports` 已放行 `./package.json` 与 `./locale/*.json`，两个 locale 文件都有 `meta.title` 与 `meta.description`）。这三类都是无报错静默失效，只能静态断言；每条都用破坏实测验证过会失败。
- **浏览器端验证脚本**（`scripts/browser/`）：`verify-switch-ui.py` 在真机 Web UI 中点开插件卡片、逐个拨开关、点批量按钮与搜索过滤，并回读 `cordis.patch.yml` 确认落盘；`verify-model-perception.py` 做四阶段闭环，用宿主真实 `SkillRegistry` 复核两侧可见性并逐行比对 UI 显示与宿主目录。地址与路径均由命令行传入，不硬编码本机环境。

### 变更

- `@deepseek-ai/schemastery` 的 peer 与 dev 约束提升至 `^3.18.4`：3.18.1 的类型声明不含 `.volatile()`，是本版开关字段的类型基础。
- 新增开发依赖 `@deepseek-ai/cosmokit`（`~1.8.5`），供端到端实测脚本按宿主同构方式构造与更新 volatile 引用。
- README 重写：去掉自述性说明与重复表述，命令块保持原样可复制，新增「卡片标题描述图标为空」这一常见故障的排查条目。

## [7.1.1] - 2026-10-02

### 修复

- **`scripts/check-same-name-priority-fs.mjs` 在 pnpm isolated 布局下无法定位官方 provider（实测脚本失效）**：脚本原先只在 `~/.dsh/profiles/{web,default}/node_modules` 下查找 `@deepseek-ai/dsh-skill-filesystem`。DSH 官方推荐 `nodeLinker: isolated`，该包并非 profile 的直接依赖，只存在于 dsh 安装本体的依赖树中，故查找必然落空并抛「未在本机 DSH profiles 下找到」。本版将候选路径扩展为三类并补上兜底扫描：profile 入口（符号链接）→ pnpm store 内 `.pnpm/@deepseek-ai+dsh-skill-filesystem@*` 真实目录（通配扫描，peer 后缀形态）→ 全局 dsh 本体（`AppData/Roaming/npm/node_modules/@deepseek-ai/dsh`）。查找失败时的错误信息改为列出全部已尝试路径，并指引改用等价验证脚本 `check-same-name-priority.mjs`（自研桩对照）。修复后官方 filesystem 同层实测由「抛错无法运行」转为 4/4 PASS，「本插件同名技能优先级最高」这一承诺恢复为可运行证据。

## [7.1.0] - 2026-10-02

### 新增

- **提炼 `SkillCatalog` 深度模块**（`src/catalog.ts`）：封装技能目录扫描、mtime 变更探测、不可变快照复用（0 额外 I/O）、热重读自愈回写与名称漂移校验；对外只暴露 `listCandidates` / `getDefinition` / `verifySpecification()` 三个接口。
- **提炼 `SkillDocument` 深度模块**（`src/document.ts`）：封装 BOM 消除、CRLF 归一化、YAML frontmatter 解析、调用策略校验与 `toCandidate` / `toDefinition` 契约转换，内建 `selfTest()` 边界自检。
- **提炼 `SkillPriorityHarness` 测试基座**（`scripts/lib/harness-common.mjs`）：统一编排真实 Cordis 上下文隔离、正反顺序注册与胜出判定，两个同名裁决实测脚本借此精简超 40% 样板代码。
- **收敛上游同步复核为统一命令行总线**（`scripts/review-sync.mjs`）：`review-sync-deep.mjs` / `-tokens.mjs` / `-fences.mjs` 三个碎片脚本转为轻量代理，`node scripts/review-sync.mjs` 一键双绿，原有调用方式保持可用。
- **边界自检下沉至模块自身**：`SkillDocument.selfTest()` 与 `SkillCatalog.verifySpecification()` 把规范校验变成导出接口的一部分，`scripts/verify.mjs` 随之退化为纯声明式调度器，不再需要外部临时目录与脚手架。
- **扩充伴生脚本健壮性自检**：全仓 10 个伴生脚本纳入 Shebang 与 LF 行尾的跨平台检查。

### 修复

- **发布流水线幂等保护**（`release.yml`）：tag 重推或 workflow 重跑时，`npm view` 命中已发布版本即跳过 publish，避免假红。同时显式指定 `--registry https://registry.npmjs.org`，修掉 runner 镜像覆盖导致 publish 静默失败的问题。

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