# dsh-superpower 领域模型词汇表 (CONTEXT.md)

> 本文件由架构评审自动生成并持续维护，记录 @wenaixi/dsh-superpower 项目的核心领域概念、模块职责边界与系统缝隙（Seams）。

---

## 核心领域概念与深度模块

### 1. SkillCatalog (技能编目)
- **定位**: 深度模块 (Deep Module)，负责技能集合的发现、轻量 mtime 版本探测、不可变快照缓存与自愈索引。
- **职责**:
  - 扫描文件系统中的技能目录，过滤隐藏文件与非技能目录；
  - 探测每个子目录下的 `SKILL.md` 文件存活性；
  - 委托 `SkillDocument` 解析文档，执行名称去重与名称漂移（Directory Name vs Frontmatter Name）校验；
  - 维护版本化不可变快照 (`cachedCandidates`)，未发生变动时 0 额外磁盘 I/O；
  - 在 `getDefinition` 热重读时自动回写内部内存映射，彻底消灭状态撕裂隔离缝；
  - 对外暴露极简的 `invalidate()` 接口，深度联动 Cordis `skills/change` 事件；
  - 对外提供 `verifyIntegrity()` 完整性体检接口，供测试脚本与治理流程复用。
- **缝隙 (Seams)**: 位于物理文件系统 I/O 与 Cordis 运行时 Provider 之间，将复杂的文件探测和异常处理完全封装在门后。

### 2. SkillDocument (技能文档)
- **定位**: 深度模块 (Deep Module)，负责单个技能 Markdown 文档的解析、清洗与契约转换。
- **职责**:
  - 去除 UTF-8 BOM 头与 CRLF 换行归一化；
  - 解析 YAML Frontmatter，校验必填字段（`name`、`description`）与调用策略（`user-invocable`、`disable-model-invocation`）；
  - 校验技能名是否严格符合 kebab-case 规范；
  - 转换生成 DSH 契约对象（`SkillCandidate` 与 `SkillDefinition`）。
- **缝隙 (Seams)**: 位于裸 Markdown 文本/文件与系统结构化技能对象之间。

### 3. SuperpowersProvider (技能提供者)
- **定位**: 运行时适配层 (Adapter)，实现 DSH 规范的 `SkillProvider` 接口。
- **职责**:
  - 维护 Cordis 插件的生命周期（注册、事件监听、卸载清理）；
  - 持有 `SkillCatalog` 实例，将 `list()` 和 `get()` 纯调度委托给编目模块；
  - 固化 `rank = 10` 优先级常数，保证本插件技能在同名裁决中胜出。

### 4. SkillCandidate (候选技能元数据)
- **定位**: 传输对象 (Contract Object)，轻量级技能概要，供模型在初次扫描时快速列举。

### 5. SkillDefinition (技能定义本体)
- **定位**: 传输对象 (Contract Object)，包含完整 Markdown 正文内容（`content`）的完整技能对象。

### 6. sync-common (上游同步契约引擎)
- **定位**: 深度模块，review-sync 三件套（deep/fences/tokens）的唯一契约实现。
- **职责**:
  - 导出 `norm`/`fenceRe`/`splitBlocks`（代码块契约）、`walkMd`（.md 遍历）、`splitComment`/`hasCJK`（中文化判定）、`syncSkillsList`（技能清单动态派生）；
  - fences 的硬编码 13 技能清单改为从上游目录动态派生，新增技能自动覆盖；
  - deep 保留自己的 `walkTree`（全文件树 + 排序），与 tokens 的 `walkMd`（仅 .md）语义刻意不合并，避免行为回归。
- **缝隙 (Seams)**: 位于上游检出与本地 skills/ 之间，中文化契约（代码块/命令/路径保持字节一致，正文译中文）的全部规则内聚于此。

### 7. harness-common (测试骨架共享引擎)
- **定位**: 深度模块，check-same-name-priority 双脚本的公共样板（`check`/`freshRegistry`/`exitByFailed`）。
- **职责**: 统一断言输出格式、Cordis 上下文构建与收尾退出码语义；断言语义改动只改一处。
- **缝隙 (Seams)**: 位于测试断言与进程退出语义之间，让两个实测脚本的差异只保留在业务断言本身。

### 8. 资源契约检查 (verify.mjs)
- **定位**: verify.mjs 新增的资源引用一致性治理。
- **职责**:
  - `extractRefs` 统一三种引用形态：markdown 链接、反引号目录路径（references/scripts/prompts/templates/examples）、反引号裸文件名；
  - `resolveResourceRefs` 校验引用缺失（FAIL）与孤儿文件（WARN），白名单承载上游遗留示例与运行时产物；
  - 随包脚本调用契约：正文调用 `scripts/*` 必须带解释器前缀（bash/node），裸路径 FAIL。
- **缝隙 (Seams)**: 位于技能正文的写作承诺与物理文件树之间，把「声称引用」与「实际存在」对齐为可断言契约。
