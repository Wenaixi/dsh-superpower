# dsh-superpower 领域模型词汇表 (CONTEXT.md)

> 本文件由架构评审自动生成并持续维护，记录 @wenaixi/dsh-superpower 核心领域概念、模块职责边界与系统接缝（Seams）。

---

## 核心领域概念与深度模块

### 1. SkillCatalog (技能编目)
- **定位**: 深度模块 (Deep Module)，位于 `src/catalog.ts`，负责技能集合的发现、轻量 mtime 版本探测、不可变快照缓存与自愈索引，以及统一编目领域门面。
- **职责**:
  - 扫描文件系统中的技能目录，过滤隐藏文件与非技能目录；
  - 探测每个子目录下的 `SKILL.md` 文件存活性；
  - 委托 `SkillDocument` 解析文档，执行名称去重与名称漂移（Directory Name vs Frontmatter Name）校验；
  - 维护版本化不可变快照 (`cachedCandidates`)，未发生变动时 0 额外磁盘 I/O（失效判据为三键聚合指纹：目录 mtime + 根级目录名集合 + 各 SKILL.md mtime，覆盖正文编辑与增量新建技能两类窗口）；
  - 在 `getDefinition` 热重读时自动回写内部内存映射，彻底消灭状态撕裂隔离缝；
  - 统一编目领域门面：在 `listCandidates` 与 `getDefinition` 接口中原生支持 `switches` 策略并在模块内部原子完成开关覆盖（`applySwitches`），对外呈现最终不可变视图，彻底消灭外部调用方（如 `SuperpowersProvider`）的手动循环映射胶水代码；
  - 对外暴露极简的 `invalidate()` 接口，深度联动 Cordis `skills/change` 事件；
  - 对外提供 `verifyIntegrity()` 完整性体检接口，供测试脚本与治理流程复用。
- **接缝 (Seams)**: 位于物理文件系统 I/O 与 Cordis 运行时 Provider 之间，将复杂的文件探测、多语言取词与开关覆盖策略完全封装在门后。

### 2. SkillDocument (技能文档)
- **定位**: 深度模块 (Deep Module)，位于 `src/document.ts`，负责单个技能 Markdown 文档的解析、清洗与契约转换。
- **职责**:
  - 去除 UTF-8 BOM 头与 CRLF 换行归一化；
  - 解析 YAML Frontmatter，校验必填字段（`name`、`description`）与调用策略（`user-invocable`、`disable-model-invocation`）；
  - 解析双语描述（英文 `description` 与中文 `description_zh`），由 `descriptionFor(language)` 按语言取词，未指定语言时取英文；
  - 校验技能名是否严格符合 kebab-case 规范；
  - 转换生成 DSH 契约对象（`SkillCandidate` 与 `SkillDefinition`）。
- **接缝 (Seams)**: 位于裸 Markdown 文本/文件与系统结构化技能对象之间。

### 3. SkillSwitches (技能开关与语言偏好)
- **定位**: 深度模块，位于 `src/switches.ts`，封装禁言表解包、语言偏好读取与调用策略覆盖，内建 `selfTest()`。
- **职责**:
  - `readSwitches(config)` 读 `disabled` volatile 表——开关状态的唯一事实源；面板只写这一张表。
  - 读取 `language` 偏好，缺失即 `undefined`，表示跟随宿主界面语言；
  - `applySwitches()` 产出 `invocation` 覆盖，list 与 get 两条路径共用同一判定语义。
- **接缝 (Seams)**: 位于 volatile 配置引用与 DSH 调用策略之间。

### 4. SuperpowersProvider (技能提供者)
- **定位**: 运行时适配层 (Adapter)，位于 `src/superpowers.ts`，实现 DSH 规范的 `SkillProvider` 接口。
- **职责**:
  - 维护 Cordis 插件的生命周期（注册、事件监听、卸载清理）；
  - 持有 `SkillCatalog` 实例，将 `list()` 和 `get()` 纯调度委托给编目模块；
  - 读 `dsh-settings` 的 `locale` 条目拿宿主界面语言，与 `language` 偏好合成最终生效语言（结果缓存，`loader/volatile-update` 时失效）；
  - 固化 `rank = 10` 优先级常数，保证本插件技能在同名裁决中胜出。

### 5. SkillCandidate (候选技能元数据)
- **定位**: 传输对象 (Contract Object)，轻量级技能概要，供模型在初次扫描时快速枚举。

### 6. SkillDefinition (技能定义本体)
- **定位**: 传输对象 (Contract Object)，包含完整 Markdown 正文内容（`content`）的完整技能对象。

### 7. SyncEngine (上游同步复核深度引擎)
- **定位**: 深度模块 (Deep Module)，位于 `scripts/lib/sync-engine.mjs`，统一封装上游同步复核引擎。
- **职责**:
  - 双树并行加载与全文件扫描（全文件树与仅 .md 树）；
  - Markdown 代码块逐块分词、SkillDocument 解析与 Token 级无损比对；
  - 集中管理上游同步契约与白名单豁免矩阵（find-polluter.sh ASCII 化豁免、SDD 嵌套控制器小节标题数容差等）；
  - 对外提供 `reviewDeep()`、`reviewTokens()`、`reviewFences()` 结构化结果接口；引擎只计算并返回 diagnostics，不直接写控制台；
  - 由 `review-sync*.mjs` 调度器消费结果并负责 CLI 报告与退出码，三大入口保持向后兼容。
- **接缝 (Seams)**: 位于上游检出与本地 skills/ 资产之间，将双树比对与差异判定收敛在引擎内部，将报告输出留在 CLI seam。

### 8. ReviewSyncCLI (上游同步复核统一总线)
- **定位**: 统一命令行调度器，位于 `scripts/review-sync.mjs`，收敛 deep、tokens 与 fences 三大碎片化薄脚本。
- **职责**:
  - 提供单命令子命令调度模式 (`deep` / `tokens` / `fences` / `all`)；
  - 默认 `all` 模式按序执行深度 Markdown 块结构比对与 Token 级敏感词逐字比对，二者皆绿方可 exit 0；
  - 通过单行代理保持原有 `review-sync-deep.mjs` 等历史入口 100% 向后兼容。
- **接缝 (Seams)**: 位于开发者/CI 交互与 `SyncEngine` 核心比对能力之间。

### 9. SkillContractChecker (技能契约治理深度模块)
- **定位**: 深度模块 (Deep Module)，位于 `scripts/lib/contract.mjs`，统一封装技能库内容契约治理。
- **职责**:
  - 相对链接死链提取与探测（`checkRelativeLinks`）；
  - 资源引用契约与孤儿文件判定（`checkResourceRefs`，两遍扫描收集，集中维护白名单）；
  - 技能文件双语 frontmatter 契约（`checkBilingualPairing`：英文 `description` 带 `Superpower Skill: ` 前缀且不含中文，中文 `description_zh` 带全角前缀且含中文，`frontmatter.name` 与目录名一致）；
  - README 语言面契约（`checkReadmeLanguage`：默认文档不得含中文标题，两份 README 顶部互跳链接齐全）；
  - 随包脚本调用守卫（`checkBareScriptCalls`，正文调用 `scripts/*` 必须带解释器前缀）；
  - 全仓无 Emoji / 图形状态符号硬扫描（`checkSymbols`）；
  - 随包 shell 脚本的 Shebang 与 CRLF 健壮性自检（`checkBundledShellScripts`）；
  - 技能正文不得复活自建 HTTP 服务（`checkNoSelfHostedService`，可视化协作已改走宿主官方文档预览）；
  - 契约守卫真实可失败自检（`assertGuardCanFail`）。
- **接缝 (Seams)**: 位于技能正文写作契约与物理文件/AST 结构之间，使测试表面与规则逻辑高度局部化，`verify.mjs` 成为无状态的轻量门禁编排器。

### 10. SkillPriorityHarness (同名裁决实测基座)
- **定位**: 深度测试 Harness，位于 `scripts/lib/harness-common.mjs`，check-same-name-priority 双脚本的公共骨架。
- **职责**:
  - 统一断言输出格式（`check`）、Cordis 上下文构建（`freshRegistry`）与收尾退出码语义（`exitByFailed`）；
  - 暴露高阶断言函数 `assertPriorityArbitration()`，将自研桩与官方 filesystem 实测脚本中的重复样板代码消除 40% 以上；
  - 将复杂的正反双向注册生命周期封装在极简声明式调用之后。
- **接缝 (Seams)**: 位于 Cordis `SkillRegistry` 与具体集成测试脚本之间。

### 11. ClientManifest (客户端双面清单纯内存提取器)
- **定位**: 深度模块 (Deep Module)，位于 `scripts/lib/client-manifest.mjs`，负责客户端内联清单与物理 `skills/` 目录的双向一致性门禁。
- **职责**:
  - 利用 Node 原生 `node:vm` 纯内存沙箱安全执行 `src/client.js` 模块工厂，通过标准模块导出契约截获 `SKILL_CATALOG` 常量；
  - 彻底消灭字符级括号配平与 `new Function` 拼接求值，0 外部进程、0 命名管道触碰，彻底免疫 Windows 沙箱管道限制；
  - 与物理磁盘编目进行双向严格比对（缺技能、多技能、双语描述漂移），守住「`skills/` 是唯一事实源」的不变量；
  - 断言 `src/client.js` 与构建产物 `lib/client.js` 的绝对一致性。
- **接缝 (Seams)**: 位于浏览器端内联镜像与服务端物理编目之间。

---

## 发布与打包

- **平台**：仅支持 DSH（DeepSeek Harness）；非 DSH 平台兼容层已全部移除
- **发布纪律**：改 `package.json#version` 必须同步打 annotated tag 并推送；npm 禁止 unpublish，装包一律用最新版，历史上发布早于平台专属化改造的旧版本已 `npm deprecate`
- **打包产物**：`npm pack --dry-run` 实测 86 个文件（package size ~187 kB，unpacked ~520 kB），随包只含 `lib/`、`skills/`、`locale/`、`icon.png`、`cordis.patch.yml`、README 双份与 LICENSE，全树扫描无非 DSH 平台残留
