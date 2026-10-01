# dsh-superpower 领域模型词汇表 (CONTEXT.md)

> 本文件由架构评审自动生成并持续维护，记录 @wenaixi/dsh-superpower 项目的核心领域概念、模块职责边界与系统缝隙（Seams）。

---

## 核心领域概念与深度模块

### 1. SkillCatalog (技能编目)
- **定位**: 深度模块 (Deep Module)，负责技能集合的发现、遍历、健康度检测与生命周期缓存。
- **职责**:
  - 扫描文件系统中的技能目录，过滤隐藏文件与非技能目录；
  - 探测每个子目录下的 `SKILL.md` 文件存活性；
  - 委托 `SkillDocument` 解析文档，执行名称去重与名称漂移（Directory Name vs Frontmatter Name）校验；
  - 提供快速内存索引，支持 `listCandidates` 与 `getDefinition`；
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
