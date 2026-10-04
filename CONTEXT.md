# dsh-superpower 领域模型词汇表 (CONTEXT.md)

> 本文件由架构评审自动生成并持续维护，记录 @wenaixi/dsh-superpower 核心领域概念、模块职责边界与系统接缝（Seams）。

---

## 核心领域概念与深度模块

### 1. SkillCatalog (技能编目)
- **定位**: 深度模块 (Deep Module)，位于 `src/catalog.ts`，负责技能集合的发现、轻量 mtime 版本探测、不可变快照缓存与自愈索引。
- **职责**:
  - 扫描文件系统中的技能目录，过滤隐藏文件与非技能目录；
  - 探测每个子目录下的 `SKILL.md` 文件存活性；
  - 委托 `SkillDocument` 解析文档，执行名称去重与名称漂移（Directory Name vs Frontmatter Name）校验；
  - 维护版本化不可变快照 (`cachedCandidates`)，未发生变动时 0 额外磁盘 I/O（失效判据为三键聚合指纹：目录 mtime + 根级目录名集合 + 各 SKILL.md mtime，覆盖正文编辑与增量新建技能两类窗口）；
  - 在 `getDefinition` 热重读时自动回写内部内存映射，彻底消灭状态撕裂隔离缝；
  - 对外暴露极简的 `invalidate()` 接口，深度联动 Cordis `skills/change` 事件；
  - 对外提供 `verifyIntegrity()` 完整性体检接口，供测试脚本与治理流程复用。
- **接缝 (Seams)**: 位于物理文件系统 I/O 与 Cordis 运行时 Provider 之间，将复杂的文件探测和异常处理完全封装在门后。

### 2. SkillDocument (技能文档)
- **定位**: 深度模块 (Deep Module)，位于 `src/document.ts`，负责单个技能 Markdown 文档的解析、清洗与契约转换。
- **职责**:
  - 去除 UTF-8 BOM 头与 CRLF 换行归一化；
  - 解析 YAML Frontmatter，校验必填字段（`name`、`description`）与调用策略（`user-invocable`、`disable-model-invocation`）；
  - 校验技能名是否严格符合 kebab-case 规范；
  - 转换生成 DSH 契约对象（`SkillCandidate` 与 `SkillDefinition`）。
- **接缝 (Seams)**: 位于裸 Markdown 文本/文件与系统结构化技能对象之间。

### 3. SuperpowersProvider (技能提供者)
- **定位**: 运行时适配层 (Adapter)，位于 `src/superpowers.ts`，实现 DSH 规范的 `SkillProvider` 接口。
- **职责**:
  - 维护 Cordis 插件的生命周期（注册、事件监听、卸载清理）；
  - 持有 `SkillCatalog` 实例，将 `list()` 和 `get()` 纯调度委托给编目模块；
  - 固化 `rank = 10` 优先级常数，保证本插件技能在同名裁决中胜出。

### 4. SkillCandidate (候选技能元数据)
- **定位**: 传输对象 (Contract Object)，轻量级技能概要，供模型在初次扫描时快速枚举。

### 5. SkillDefinition (技能定义本体)
- **定位**: 传输对象 (Contract Object)，包含完整 Markdown 正文内容（`content`）的完整技能对象。

### 6. SyncEngine (上游同步复核深度引擎)
- **定位**: 深度模块 (Deep Module)，位于 `scripts/lib/sync-engine.mjs`，统一封装上游同步复核引擎。
- **职责**:
  - 双树并行加载与全文件扫描（全文件树与仅 .md 树）；
  - Markdown 代码块逐块分词、SkillDocument 解析与 Token 级无损比对；
  - 集中管理上游同步契约与白名单豁免矩阵（find-polluter.sh ASCII 化豁免、SDD 嵌套控制器小节标题数容差等）；
  - 对外提供 `reviewDeep()`、`reviewTokens()`、`reviewFences()` 极简高内聚接口；
  - 彻底收敛 `review-sync-deep`、`review-sync-tokens`、`review-sync-fences` 三大脚本为极简调度器，消除 70% 重复遍历与样板代码。
- **接缝 (Seams)**: 位于上游检出与本地 skills/ 资产之间，将双树比对、AST/代码块切分、差异判定与格式化报告完全收敛在引擎内部。

### 7. SkillContractChecker (技能契约治理深度模块)
- **定位**: 深度模块 (Deep Module)，位于 `scripts/lib/contract.mjs`，统一封装技能库内容契约治理。
- **职责**:
  - 相对链接死链提取与探测（`checkRelativeLinks`）；
  - 资源引用契约与孤儿文件判定（`checkResourceRefs`，两遍扫描收集，集中维护白名单）；
  - 随包脚本调用守卫（`checkBareScriptCalls`，正文调用 `scripts/*` 必须带解释器前缀）；
  - 全仓无 Emoji / 图形状态符号硬扫描（`checkSymbols`）；
  - Visual Companion 随包后台脚本（`server.cjs`、`helper.js`）纯原生静态语法与健全性自检（`checkCompanionScripts`，闭合测试表面遗漏）；
  - 契约守卫真实可失败自检（`assertGuardCanFail`）。
- **接缝 (Seams)**: 位于技能正文写作契约与物理文件/AST 结构之间，使测试表面与规则逻辑高度局部化，`verify.mjs` 成为无状态的轻量门禁编排器。

### 8. harness-common (测试骨架共享引擎)
- **定位**: 深度模块，位于 `scripts/lib/harness-common.mjs`，check-same-name-priority 双脚本的公共样板（`check`/`freshRegistry`/`exitByFailed`）。
- **职责**: 统一断言输出格式、Cordis 上下文构建与收尾退出码语义；断言语义改动只改一处。
- **接缝 (Seams)**: 位于测试断言与进程退出语义之间，让两个实测脚本的差异只保留在业务断言本身。

---

## 版本与发布状态

- **当前版本**：`7.0.1`（2026-10-02 修复版；重发干净 tarball）
- **平台**：仅支持 DSH（DeepSeek Harness）；非 DSH 平台兼容层已全部移除
- **发布纪律**：任何修改 `package.json#version` 的提交必须同步创建并推送 annotated tag；npm 禁止 unpublish，污染版本以 `npm deprecate` 废弃
- **本地深度验证**：`sp-deep-verify` profile（`dsh-base` + `dsh-headless` + 本插件），真实 headless 会话逐技能调用 `skill` 工具加载 15 技能，frontmatter description 与 `##` 标题逐项断言一致；安装产物 82 文件全树扫描无平台残留
- **历史污染说明**：npm `7.0.0`（tag 早于专属化改造）tarball 残留 `codex-tools.md` 与 `CLAUDE_MD_TESTING.md`，已废弃（`npm deprecate` 文案已生效）；`7.0.1` 为当前唯一推荐版本，官方源 `latest` 已指向 `7.0.1`
### 6. SkillPriorityHarness (同名裁决实测基座)
- **定位**: 深度测试 Harness，位于 `scripts/lib/harness-common.mjs`，负责正序/反序注册编排、同名胜出断言、未受影响技能独立性与总数校验。
- **职责**:
  - 提供 `freshRegistry()` 建立隔离的全新 Cordis 上下文；
  - 暴露高阶断言函数 `assertPriorityArbitration()`，将自研桩与官方 filesystem 实测脚本中的重复样板代码消除 40% 以上；
  - 将复杂的正反双向注册生命周期封装在极简声明式调用之后。
- **接缝 (Seams)**: 位于 Cordis `SkillRegistry` 与具体集成测试脚本之间。

### 7. ReviewSyncCLI (上游同步复核统一总线)
- **定位**: 统一命令行调度器，位于 `scripts/review-sync.mjs`，收敛 deep、tokens 与 fences 三大碎片化薄脚本。
- **职责**:
  - 提供单命令子命令调度模式 (`deep` / `tokens` / `fences` / `all`)；
  - 默认 `all` 模式按序执行深度 Markdown 块结构比对与 Token 级敏感词逐字比对，二者皆绿方可 exit 0；
  - 通过单行代理保持原有 `review-sync-deep.mjs` 等历史入口 100% 向后兼容。
- **接缝 (Seams)**: 位于开发者/CI 交互与 `SyncEngine` 核心比对能力之间。
