# Skill 编写最佳实践

> 学习如何编写高效的 Skill，让 Agent 能够发现并成功使用。

好的 Skill 简洁、结构清晰，并经过真实场景验证。本指南提供实用的编写决策，帮助你写出 Agent 可发现、易用的 Skill。

关于 Skill 工作原理的概念背景，请参阅 [Skill 概览](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)。

## 核心原则

### 简洁为先

[上下文窗口](https://platform.claude.com/docs/en/build-with-claude/context-windows)是公共资源。你的 Skill 会与 Agent 所需的其他所有内容共享上下文窗口，包括：

* 系统提示词
* 对话历史
* 其他 Skill 的元数据
* 你的实际请求

Skill 中的并非每个 token 都会立即产生开销。启动时，只会预加载所有 Skill 的元数据（名称和描述）。只有当 Skill 变为相关时，Agent 才会读取 SKILL.md，并按需读取其他文件。尽管如此，保持 SKILL.md 简洁仍然很重要：一旦 Agent 加载它，每个 token 都会与对话历史和其他上下文竞争。

**默认假设**：Agent 本身已经非常聪明

只补充 Agent 尚不具备的上下文。对每一条信息都进行审视：

* “Agent 真的需要这段解释吗？”
* “我可以假设 Agent 已经知道这个吗？”
* “这段话值得付出 token 成本吗？”

**好的示例：简洁**（约 50 tokens）：

````markdown  theme={null}
## 提取 PDF 文本

使用 pdfplumber 提取文本：

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

**差的示例：过于冗长**（约 150 tokens）：

```markdown  theme={null}
## 提取 PDF 文本

PDF（便携式文档格式）是一种常见的文件格式，包含文本、图像和其他内容。要从 PDF 中提取文本，你需要使用一个库。有许多可用于 PDF 处理的库，但我们推荐 pdfplumber，因为它易于使用且能处理大多数情况。首先，你需要使用 pip 安装它，然后可以使用下面的代码……
```

简洁版本假设 Agent 已经知道 PDF 是什么以及库的基本用法。

### 设置合适的自由度

根据任务的易错程度和可变性，匹配相应的具体程度。

**高自由度**（基于文本的指令）：

适用于：

* 多种方案都可行
* 决策依赖于上下文
* 以启发式规则指导方法

示例：

```markdown  theme={null}
## 代码审查流程

1. 分析代码结构与组织
2. 检查潜在的 bug 或边界情况
3. 就可读性和可维护性提出改进建议
4. 验证是否符合项目规范
```

**中自由度**（带参数的伪代码或脚本）：

适用于：

* 存在推荐的模式
* 允许一定程度的变化
* 配置会影响行为

示例：

````markdown  theme={null}
## 生成报告

使用此模板并按需自定义：

```python
def generate_report(data, format="markdown", include_charts=True):
    # Process data
    # Generate output in specified format
    # Optionally include visualizations
```
````

**低自由度**（具体脚本，参数很少或没有）：

适用于：

* 操作脆弱、容易出错
* 一致性至关重要
* 必须遵循特定顺序

示例：

````markdown  theme={null}
## 数据库迁移

严格按此脚本执行：

```bash
python scripts/migrate.py --verify --backup
```

不要修改命令或添加额外参数。
````

**类比**：把 Agent 想象成在路径上探索的机器人：

* **两侧是悬崖的窄桥**：只有一条安全的路。提供具体的护栏和精确的指令（低自由度）。例如：必须按精确顺序执行的数据库迁移。
* **无任何障碍的开阔地**：多条路径都能成功。给出大致方向，相信 Agent 能找到最佳路线（高自由度）。例如：具体方法取决于上下文的代码审查。

### 在所有计划使用的模型上测试

Skill 是对模型的补充，其效果取决于底层模型。请在所有计划使用的模型上测试你的 Skill。

**按模型的测试考量**：

* **Claude Haiku**（快速、经济）：Skill 是否提供了足够的指引？
* **Claude Sonnet**（均衡）：Skill 是否清晰高效？
* **Claude Opus**（强推理）：Skill 是否避免了过度解释？

在 Opus 上表现完美的写法，对 Haiku 可能需要更多细节。如果计划在多个模型间复用 Skill，应确保指令在所有模型上都能良好工作。

## Skill 结构

<Note>
  **YAML Frontmatter**：SKILL.md 的 frontmatter 需要两个字段：

  * `name` - Skill 的人类可读名称（最多 64 个字符）
  * `description` - 一句话描述 Skill 的功能和使用时机（最多 1024 个字符）

  关于完整的 Skill 结构详情，请参阅 [Skill 概览](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#skill-structure)。
</Note>

### 命名规范

使用一致的命名模式，让 Skill 更易于引用和讨论。我们推荐 Skill 名称使用**动名词形式**（动词 + -ing），这样能清晰描述 Skill 提供的活动或能力。

**好的命名示例（动名词形式）**：

* "Processing PDFs"
* "Analyzing spreadsheets"
* "Managing databases"
* "Testing code"
* "Writing documentation"

**可接受的替代形式**：

* 名词短语："PDF Processing"、"Spreadsheet Analysis"
* 动词导向："Process PDFs"、"Analyze Spreadsheets"

**应避免**：

* 含糊的名称："Helper"、"Utils"、"Tools"
* 过于宽泛："Documents"、"Data"、"Files"
* 在 Skill 集合内模式不一致

一致的命名有助于：

* 在文档和对话中引用 Skill
* 一眼看出 Skill 的用途
* 在多个 Skill 中进行组织和检索
* 保持专业、统一的 Skill 库

### 编写有效的描述

`description` 字段用于 Skill 的发现，应同时包含 Skill 的功能和使用时机。

<Warning>
  **始终使用第三人称**。描述会被注入到系统提示词中，人称不一致会导致发现问题。

  * **好：** "Processes Excel files and generates reports"
  * **避免：** "I can help you process Excel files"
  * **避免：** "You can use this to process Excel files"
</Warning>

**做到具体并包含关键词**。同时说明 Skill 的功能以及触发使用的具体场景。

每个 Skill 只有一个 description 字段。该描述对 Skill 选择至关重要：Agent 会依据它从可能多达 100+ 个可用 Skill 中挑选合适的。你的描述必须提供足够细节，让 Agent 知道何时选择该 Skill，而 SKILL.md 的其余部分则提供实现细节。

有效示例：

**PDF 处理 Skill：**

```yaml  theme={null}
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**Excel 分析 Skill：**

```yaml  theme={null}
description: Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.
```

**Git 提交辅助 Skill：**

```yaml  theme={null}
description: Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.
```

避免以下这类模糊描述：

```yaml  theme={null}
description: Helps with documents
```

```yaml  theme={null}
description: Processes data
```

```yaml  theme={null}
description: Does stuff with files
```

### 渐进式披露模式

SKILL.md 作为概览，按需引导 Agent 查阅详细材料，就像入门指南中的目录。关于渐进式披露如何工作，请参阅概览中的 [How Skills work](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#how-skills-work)。

**实践建议：**

* 为保证最佳性能，SKILL.md 正文保持在 500 行以内
* 接近该限制时，将内容拆分到独立文件
* 使用下面的模式有效组织指令、代码和资源

#### 可视化概览：从简单到复杂

基础 Skill 最初只有一个包含元数据和指令的 SKILL.md 文件：

<img src="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=87782ff239b297d9a9e8e1b72ed72db9" alt="Simple SKILL.md file showing YAML frontmatter and markdown body" data-og-width="2048" width="2048" data-og-height="1153" height="1153" data-path="images/agent-skills-simple-file.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=280&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=c61cc33b6f5855809907f7fda94cd80e 280w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=560&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=90d2c0c1c76b36e8d485f49e0810dbfd 560w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=840&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=ad17d231ac7b0bea7e5b4d58fb4aeabb 840w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=1100&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=f5d0a7a3c668435bb0aee9a3a8f8c329 1100w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=1650&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=0e927c1af9de5799cfe557d12249f6e6 1650w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-simple-file.png?w=2500&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=46bbb1a51dd4c8202a470ac8c80a893d 2500w" />

随着 Skill 增长，你可以打包仅在需要时才加载的额外内容：

<img src="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=a5e0aa41e3d53985a7e3e43668a33ea3" alt="Bundling additional reference files like reference.md and forms.md." data-og-width="2048" width="2048" data-og-height="1327" height="1327" data-path="images/agent-skills-bundling-content.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=280&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=f8a0e73783e99b4a643d79eac86b70a2 280w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=560&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=dc510a2a9d3f14359416b706f067904a 560w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=840&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=82cd6286c966303f7dd914c28170e385 840w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=1100&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=56f3be36c77e4fe4b523df209a6824c6 1100w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=1650&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=d22b5161b2075656417d56f41a74f3dd 1650w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-bundling-content.png?w=2500&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=3dd4bdd6850ffcc96c6c45fcb0acd6eb 2500w" />

完整的 Skill 目录结构可能如下所示：

```
pdf/
├── SKILL.md              # Main instructions (loaded when triggered)
├── FORMS.md              # Form-filling guide (loaded as needed)
├── reference.md          # API reference (loaded as needed)
├── examples.md           # Usage examples (loaded as needed)
└── scripts/
    ├── analyze_form.py   # Utility script (executed, not loaded)
    ├── fill_form.py      # Form filling script
    └── validate.py       # Validation script
```

#### 模式 1：带引用的高层指南

````markdown  theme={null}
---
name: PDF Processing
description: Extracts text and tables from PDF files, fills forms, and merges documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
---

# PDF Processing

## Quick start

Extract text with pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## Advanced features

**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
**Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
````

Agent 仅在需要时才加载 FORMS.md、REFERENCE.md 或 EXAMPLES.md。

#### 模式 2：按领域组织

对于涵盖多领域的 Skill，按领域组织内容，避免加载无关上下文。当用户询问销售指标时，Agent 只需读取销售相关的 schema，无需加载财务或营销数据。这样可以保持 token 占用低、上下文聚焦。

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

````markdown SKILL.md theme={null}
# BigQuery Data Analysis

## Available datasets

**Finance**: Revenue, ARR, billing → See [reference/finance.md](reference/finance.md)
**Sales**: Opportunities, pipeline, accounts → See [reference/sales.md](reference/sales.md)
**Product**: API usage, features, adoption → See [reference/product.md](reference/product.md)
**Marketing**: Campaigns, attribution, email → See [reference/marketing.md](reference/marketing.md)

## Quick search

Find specific metrics using grep:

```bash
grep -i "revenue" reference/finance.md
grep -i "pipeline" reference/sales.md
grep -i "api usage" reference/product.md
```
````

#### 模式 3：条件式详情

展示基础内容，链接到进阶内容：

```markdown  theme={null}
# DOCX Processing

## Creating documents

Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents

For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```

仅当用户需要这些功能时，Agent 才会读取 REDLINING.md 或 OOXML.md。

### 避免深层嵌套引用

当文件通过多级引用被间接指向时，Agent 可能会只做部分读取。遇到嵌套引用时，Agent 可能会使用 `head -100` 等命令预览内容，而非读取完整文件，导致信息不完整。

**保持引用仅一层深度，紧邻 SKILL.md**。所有引用文件都应直接从 SKILL.md 链接，确保 Agent 在需要时读取完整文件。

**差的示例：层级过深**：

```markdown  theme={null}
# SKILL.md
See [advanced.md](advanced.md)...

# advanced.md
See [details.md](details.md)...

# details.md
Here's the actual information...
```

**好的示例：仅一层深度**：

```markdown  theme={null}
# SKILL.md

**Basic usage**: [instructions in SKILL.md]
**Advanced features**: See [advanced.md](advanced.md)
**API reference**: See [reference.md](reference.md)
**Examples**: See [examples.md](examples.md)
```

### 为较长的引用文件添加目录

对于超过 100 行的引用文件，在顶部包含目录。这样即使 Agent 仅预览部分内容，也能看到可用信息的全貌。

**示例**：

```markdown  theme={null}
# API Reference

## Contents
- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features (batch operations, webhooks)
- Error handling patterns
- Code examples

## Authentication and setup
...

## Core methods
...
```

Agent 随后可以按需读取完整文件或跳转到特定章节。

关于这种基于文件系统的架构如何实现渐进式披露，请参阅下文进阶部分中的[运行环境](#运行环境)一节。

## 工作流与反馈闭环

### 为复杂任务使用工作流

将复杂操作拆解为清晰的顺序步骤。对于特别复杂的工作流，提供一份清单，让 Agent 复制到回复中并随进度勾选。

**示例 1：研究综合工作流**（适用于无代码的 Skill）：

````markdown  theme={null}
## Research synthesis workflow

Copy this checklist and track your progress:

```
Research Progress:
- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
- [ ] Step 3: Cross-reference claims
- [ ] Step 4: Create structured summary
- [ ] Step 5: Verify citations
```

**Step 1: Read all source documents**

Review each document in the `sources/` directory. Note the main arguments and supporting evidence.

**Step 2: Identify key themes**

Look for patterns across sources. What themes appear repeatedly? Where do sources agree or disagree?

**Step 3: Cross-reference claims**

For each major claim, verify it appears in the source material. Note which source supports each point.

**Step 4: Create structured summary**

Organize findings by theme. Include:
- Main claim
- Supporting evidence from sources
- Conflicting viewpoints (if any)

**Step 5: Verify citations**

Check that every claim references the correct source document. If citations are incomplete, return to Step 3.
````

此示例展示了工作流如何应用于无需代码的分析任务。清单模式适用于任何复杂的多步骤流程。

**示例 2：PDF 表单填充工作流**（适用于带代码的 Skill）：

````markdown  theme={null}
## PDF form filling workflow

Copy this checklist and check off items as you complete them:

```
Task Progress:
- [ ] Step 1: Analyze the form (run analyze_form.py)
- [ ] Step 2: Create field mapping (edit fields.json)
- [ ] Step 3: Validate mapping (run validate_fields.py)
- [ ] Step 4: Fill the form (run fill_form.py)
- [ ] Step 5: Verify output (run verify_output.py)
```

**Step 1: Analyze the form**

Run: `python scripts/analyze_form.py input.pdf`

This extracts form fields and their locations, saving to `fields.json`.

**Step 2: Create field mapping**

Edit `fields.json` to add values for each field.

**Step 3: Validate mapping**

Run: `python scripts/validate_fields.py fields.json`

Fix any validation errors before continuing.

**Step 4: Fill the form**

Run: `python scripts/fill_form.py input.pdf fields.json output.pdf`

**Step 5: Verify output**

Run: `python scripts/verify_output.py output.pdf`

If verification fails, return to Step 2.
````

清晰的步骤可防止 Agent 跳过关键校验。清单有助于你和 Agent 共同跟踪多步骤工作流的进度。

### 实现反馈闭环

**常见模式**：运行校验器 → 修复错误 → 重复

此模式能显著提升输出质量。

**示例 1：风格指南合规**（适用于无代码的 Skill）：

```markdown  theme={null}
## Content review process

1. Draft your content following the guidelines in STYLE_GUIDE.md
2. Review against the checklist:
   - Check terminology consistency
   - Verify examples follow the standard format
   - Confirm all required sections are present
3. If issues found:
   - Note each issue with specific section reference
   - Revise the content
   - Review the checklist again
4. Only proceed when all requirements are met
5. Finalize and save the document
```

这展示了使用参考文档而非脚本的校验循环模式。“校验器”是 STYLE_GUIDE.md，Agent 通过读取和对比来执行检查。

**示例 2：文档编辑流程**（适用于带代码的 Skill）：

```markdown  theme={null}
## Document editing process

1. Make your edits to `word/document.xml`
2. **Validate immediately**: `python ooxml/scripts/validate.py unpacked_dir/`
3. If validation fails:
   - Review the error message carefully
   - Fix the issues in the XML
   - Run validation again
4. **Only proceed when validation passes**
5. Rebuild: `python ooxml/scripts/pack.py unpacked_dir/ output.docx`
6. Test the output document
```

校验循环能及早捕获错误。

## 内容规范

### 避免时效性信息

不要包含会过时的信息：

**差的示例：时效性强**（会变错）：

```markdown  theme={null}
If you're doing this before August 2025, use the old API.
After August 2025, use the new API.
```

**好的示例**（使用“旧模式”章节）：

```markdown  theme={null}
## Current method

Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns

<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>

The v1 API used: `api.example.com/v1/messages`

This endpoint is no longer supported.
</details>
```

“旧模式”章节在不干扰主要内容的前提下提供了历史上下文。

### 使用一致的术语

在整个 Skill 中选择一个术语并保持一致：

**好 - 保持一致**：

* 始终用 "API endpoint"
* 始终用 "field"
* 始终用 "extract"

**差 - 不一致**：

* 混用 "API endpoint"、"URL"、"API route"、"path"
* 混用 "field"、"box"、"element"、"control"
* 混用 "extract"、"pull"、"get"、"retrieve"

一致性能帮助 Agent 更好地理解和执行指令。

## 常用模式

### 模板模式

为输出格式提供模板。根据需求匹配严格程度。

**对于严格要求**（如 API 响应或数据格式）：

````markdown  theme={null}
## Report structure

ALWAYS use this exact template structure:

```markdown
# [Analysis Title]

## Executive summary
[One-paragraph overview of key findings]

## Key findings
- Finding 1 with supporting data
- Finding 2 with supporting data
- Finding 3 with supporting data

## Recommendations
1. Specific actionable recommendation
2. Specific actionable recommendation
```
````

**对于灵活指引**（需要适配时）：

````markdown  theme={null}
## Report structure

Here is a sensible default format, but use your best judgment based on the analysis:

```markdown
# [Analysis Title]

## Executive summary
[Overview]

## Key findings
[Adapt sections based on what you discover]

## Recommendations
[Tailor to the specific context]
```

Adjust sections as needed for the specific analysis type.
````

### 示例模式

对于输出质量依赖示例的 Skill，像常规提示词一样提供输入/输出对：

````markdown  theme={null}
## Commit message format

Generate commit messages following these examples:

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```

**Example 2:**
Input: Fixed bug where dates displayed incorrectly in reports
Output:
```
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
```

**Example 3:**
Input: Updated dependencies and refactored error handling
Output:
```
chore: update dependencies and refactor error handling

- Upgrade lodash to 4.17.21
- Standardize error response format across endpoints
```

Follow this style: type(scope): brief description, then detailed explanation.
````

相比单纯的文字描述，示例能让 Agent 更清晰地理解期望的风格和详细程度。

### 条件工作流模式

引导 Agent 完成决策点：

```markdown  theme={null}
## Document modification workflow

1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Use docx-js library
   - Build document from scratch
   - Export to .docx format

3. Editing workflow:
   - Unpack existing document
   - Modify XML directly
   - Validate after each change
   - Repack when complete
```

<Tip>
  如果工作流变得庞大或步骤繁多，考虑将其拆分到独立文件，并根据任务让 Agent 读取相应的文件。
</Tip>

## 评估与迭代

### 优先构建评估

**在编写大量文档之前先创建评估。** 这能确保你的 Skill 解决的是真实问题，而不是在为假想需求写文档。

**评估驱动的开发：**

1. **识别缺口**：在不使用 Skill 的情况下让 Agent 执行代表性任务。记录具体的失败点或缺失的上下文
2. **创建评估**：构建三个测试这些缺口的场景
3. **建立基线**：在不使用 Skill 的情况下衡量 Agent 的表现
4. **编写最简指令**：仅创建足以弥补缺口、通过评估的内容
5. **迭代**：执行评估、与基线对比、并优化

这种方法确保你解决的是实际问题，而不是预测可能永远不会出现的需求。

**评估结构**：

```json  theme={null}
{
  "skills": ["pdf-processing"],
  "query": "Extract all text from this PDF file and save it to output.txt",
  "files": ["test-files/document.pdf"],
  "expected_behavior": [
    "Successfully reads the PDF file using an appropriate PDF processing library or command-line tool",
    "Extracts text content from all pages in the document without missing any pages",
    "Saves the extracted text to a file named output.txt in a clear, readable format"
  ]
}
```

<Note>
  此示例展示了带有简单测试准则的数据驱动评估。我们目前不提供内置的评估运行方式。用户可以自行搭建评估系统。评估是衡量 Skill 有效性的可信依据。
</Note>

### 与 Agent 协同迭代开发 Skill

最高效的 Skill 开发过程本身就需要 Agent 参与。与一个实例（“Agent A”）协作创建一个 Skill，供其他实例（“Agent B”）使用。Agent A 帮你设计和打磨指令，而 Agent B 在真实任务中测试它们。之所以有效，是因为底层模型既理解如何编写高效的 Agent 指令，也清楚 Agent 需要哪些信息。

**创建新 Skill：**

1. **在不使用 Skill 的情况下完成任务**：与 Agent A 通过常规提示词协作完成一个问题。在过程中，你会自然地提供上下文、解释偏好、分享流程知识。留意你反复提供的信息。

2. **识别可复用的模式**：完成任务后，识别你在哪些上下文中提供了对未来类似任务有用的信息。

   **示例**：如果你完成了一次 BigQuery 分析，你可能提供了表名、字段定义、过滤规则（如“始终排除测试账户”）以及常用查询模式。

3. **让 Agent A 创建 Skill**："创建一个 Skill，沉淀我们刚才使用的 BigQuery 分析模式。包含表结构、命名规范以及过滤测试账户的规则。"

   <Tip>
     现代 Agent 原生理解 Skill 的格式和结构。你不需要特殊的系统提示词或“编写 Skill”的 Skill 来获得帮助。只需让 Agent 创建 Skill，它就会生成带有正确 frontmatter 和正文内容的 SKILL.md。
   </Tip>

4. **检查简洁性**：检查 Agent A 是否添加了不必要的解释。追问：“删除关于 win rate 含义的解释——Agent 已经知道了。”

5. **优化信息架构**：让 Agent A 更有效地组织内容。例如：“这样组织一下，把表结构放到独立的引用文件中。我们之后可能会添加更多表。”

6. **在类似任务上测试**：让加载了 Skill 的 Agent B（一个全新的实例）在相关用例上使用该 Skill。观察 Agent B 是否找到正确信息、是否正确应用规则、是否成功完成任务。

7. **基于观察迭代**：如果 Agent B 遇到困难或遗漏了什么，回到 Agent A 并给出具体反馈：“Agent 使用这个 Skill 时，在 Q4 的筛选中忘了按日期过滤。我们是否应该增加一节关于日期过滤模式的内容？”

**迭代现有 Skill：**

在改进 Skill 时，同样采用分层模式。你需要在以下角色间交替：

* **与 Agent A 协作**（帮助优化 Skill 的专家）
* **用 Agent B 测试**（使用 Skill 执行真实工作的 Agent）
* **观察 Agent B 的行为**并将洞察带回给 Agent A

1. **在真实工作流中使用 Skill**：让加载了 Skill 的 Agent B 执行真实任务，而非测试场景

2. **观察 Agent B 的行为**：留意它在哪里遇到困难、哪里成功、或做出意外选择

   **观察示例**："当我让 Agent B 生成区域销售报告时，它写了查询却忘了过滤掉测试账户，尽管 Skill 中提到了这条规则。"

3. **回到 Agent A 进行改进**：分享当前的 SKILL.md 并描述你的观察。追问：“我注意到 Agent B 在我要求区域报告时忘了过滤测试账户。Skill 中提到了过滤，但也许不够突出？”

4. **审视 Agent A 的建议**：Agent A 可能会建议重新组织以让规则更醒目，使用更强的措辞如“MUST filter”而非“always filter”，或重构工作流章节。

5. **应用并测试改动**：用 Agent A 的优化更新 Skill，然后让 Agent B 在类似请求上再次测试

6. **基于使用情况持续重复**：随着遇到新场景，继续这个观察-优化-测试的循环。每一次迭代都基于真实的 Agent 行为而非假设来改进 Skill。

**收集团队反馈：**

1. 与团队成员分享 Skill 并观察其使用情况
2. 询问：Skill 是否在预期时被触发？指令是否清晰？还缺少什么？
3. 吸纳反馈以弥补你自身使用模式中的盲点

**为什么这种方法有效**：Agent A 理解 Agent 的需求，你提供领域专业知识，Agent B 通过真实使用暴露缺口，迭代优化基于观察到的行为而非假设来改进 Skill。

### 观察 Agent 如何浏览 Skill

在迭代 Skill 时，关注 Agent 在实践中如何实际使用它们。留意：

* **意外的探索路径**：Agent 是否以你未预期的顺序读取文件？这可能说明你的结构不如想象中直观
* **遗漏的关联**：Agent 是否未能跟随指向重要文件的引用？你的链接可能需要更明确或更醒目
* **对某部分的过度依赖**：如果 Agent 反复读取同一文件，考虑该内容是否应该直接放在主 SKILL.md 中
* **被忽略的内容**：如果 Agent 从未访问某个打包文件，它可能是多余的，或在主指令中提示不够明显

基于这些观察而非假设进行迭代。Skill 元数据中的 `name` 和 `description` 尤为关键。Agent 会根据它们来决定是否针对当前任务触发 Skill。确保它们清晰描述了 Skill 的功能和适用时机。

## 需要避免的反模式

### 避免使用 Windows 风格路径

始终使用正斜杠，即使在 Windows 上：

* ✓ **好**：`scripts/helper.py`、`reference/guide.md`
* ✗ **避免**：`scripts\helper.py`、`reference\guide.md`

Unix 风格路径在所有平台上都可用，而 Windows 风格路径在 Unix 系统上会导致错误。

### 避免提供过多选项

除非必要，不要呈现多种方案：

````markdown  theme={null}
**差的示例：选项过多**（令人困惑）：
"You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image, or..."

**好的示例：提供默认值**（带逃生通道）：
"Use pdfplumber for text extraction:
```python
import pdfplumber
```

For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."
````

## 进阶：包含可执行代码的 Skill

以下章节聚焦于包含可执行脚本的 Skill。如果你的 Skill 仅使用 markdown 指令，请跳至[高效 Skill 检查清单](#高效-skill-检查清单)。

### 解决问题，而非推给 Agent

在为 Skill 编写脚本时，应处理错误情况，而不是推给 Agent。

**好的示例：显式处理错误**：

```python  theme={null}
def process_file(path):
    """Process a file, creating it if it doesn't exist."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        # Create file with default content instead of failing
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        # Provide alternative instead of failing
        print(f"Cannot access {path}, using default")
        return ''
```

**差的示例：推给 Agent**：

```python  theme={null}
def process_file(path):
    # Just fail and let the agent figure it out
    return open(path).read()
```

配置参数也应有依据并做好文档，避免出现“魔法常量”（Ousterhout 定律）。如果你自己都不知道正确的值，Agent 又如何确定？

**好的示例：自解释**：

```python  theme={null}
# HTTP requests typically complete within 30 seconds
# Longer timeout accounts for slow connections
REQUEST_TIMEOUT = 30

# Three retries balances reliability vs speed
# Most intermittent failures resolve by the second retry
MAX_RETRIES = 3
```

**差的示例：魔法数字**：

```python  theme={null}
TIMEOUT = 47  # Why 47?
RETRIES = 5   # Why 5?
```

### 提供工具脚本

即使 Agent 自己也能写脚本，预制的脚本仍有优势：

**工具脚本的好处**：

* 比生成的代码更可靠
* 节省 token（无需在上下文中包含代码）
* 节省时间（无需生成代码）
* 确保多次使用的一致性

<img src="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=4bbc45f2c2e0bee9f2f0d5da669bad00" alt="Bundling executable scripts alongside instruction files" data-og-width="2048" width="2048" data-og-height="1154" height="1154" data-path="images/agent-skills-executable-scripts.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=280&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=9a04e6535a8467bfeea492e517de389f 280w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=560&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=e49333ad90141af17c0d7651cca7216b 560w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=840&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=954265a5df52223d6572b6214168c428 840w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=1100&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=2ff7a2d8f2a83ee8af132b29f10150fd 1100w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=1650&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=48ab96245e04077f4d15e9170e081cfb 1650w, https://mintcdn.com/anthropic-claude-docs/4Bny2bjzuGBK7o00/images/agent-skills-executable-scripts.png?w=2500&fit=max&auto=format&n=4Bny2bjzuGBK7o00&q=85&s=0301a6c8b3ee879497cc5b5483177c90 2500w" />

上图展示了可执行脚本如何与指令文件协同工作。指令文件（forms.md）引用脚本，Agent 可以执行它而无需将完整内容加载到上下文中。

**重要区别**：在指令中明确 Agent 应该：

* **执行脚本**（最常见）："运行 `analyze_form.py` 来提取字段"
* **作为参考阅读**（针对复杂逻辑）："参见 `analyze_form.py` 了解字段提取算法"

对于大多数工具脚本，优先选择执行，因为它更可靠、更高效。关于脚本执行如何工作，请参阅下文[运行环境](#运行环境)一节。

**示例**：

````markdown  theme={null}
## Utility scripts

**analyze_form.py**: Extract all form fields from PDF

```bash
python scripts/analyze_form.py input.pdf > fields.json
```

Output format:
```json
{
  "field_name": {"type": "text", "x": 100, "y": 200},
  "signature": {"type": "sig", "x": 150, "y": 500}
}
```

**validate_boxes.py**: Check for overlapping bounding boxes

```bash
python scripts/validate_boxes.py fields.json
# Returns: "OK" or lists conflicts
```

**fill_form.py**: Apply field values to PDF

```bash
python scripts/fill_form.py input.pdf fields.json output.pdf
```
````

### 使用视觉分析

当输入可以渲染为图像时，让 Agent 进行分析：

````markdown  theme={null}
## Form layout analysis

1. Convert PDF to images:
    ```bash
    python scripts/pdf_to_images.py form.pdf
    ```

2. Analyze each page image to identify form fields
3. The agent can see field locations and types visually
````

<Note>
  在此示例中，你需要编写 `pdf_to_images.py` 脚本。
</Note>

Agent 的视觉能力有助于理解布局和结构。

### 创建可验证的中间产物

当 Agent 执行复杂、开放式任务时，可能会出错。“计划-校验-执行”模式通过让 Agent 先以结构化格式创建计划，再用脚本校验计划，然后才执行，从而及早捕获错误。

**示例**：假设让 Agent 根据电子表格更新 PDF 中的 50 个表单字段。如果没有校验，它可能会引用不存在的字段、创建冲突的值、遗漏必填字段或错误地应用更新。

**解决方案**：使用上面展示的工作流模式（PDF 表单填充），但增加一个在应用变更前会被校验的中间文件 `changes.json`。工作流变为：分析 → **创建计划文件** → **校验计划** → 执行 → 验证。

**为什么此模式有效：**

* **及早捕获错误**：在应用变更前通过校验发现问题
* **机器可验证**：脚本提供客观验证
* **可回退的规划**：Agent 可以在不触碰原始文件的情况下反复迭代计划
* **清晰的调试**：错误信息指向具体问题

**何时使用**：批量操作、破坏性变更、复杂校验规则、高风险操作。

**实现建议**：让校验脚本输出详细、具体的错误信息，例如 "Field 'signature\_date' not found. Available fields: customer\_name, order\_total, signature\_date\_signed"，以帮助 Agent 修复问题。

### 依赖管理

Skill 在代码执行环境中运行，且存在平台差异限制：

* **claude.ai**：可以从 npm 和 PyPI 安装包，并从 GitHub 仓库拉取
* **Anthropic API**：无网络访问，无法在运行时安装包

在 SKILL.md 中列出所需依赖，并通过[代码执行工具文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)确认其可用性。

### 运行环境

Skill 在具备文件系统访问、bash 命令和代码执行能力的代码执行环境中运行。关于该架构的概念解释，请参阅概览中的 [The Skills architecture](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#the-skills-architecture)。

**对编写的影响：**

**Agent 如何访问 Skill：**

1. **元数据预加载**：启动时，所有 Skill 的 YAML frontmatter 中的名称和描述会被加载到系统提示词中
2. **按需读取文件**：Agent 需要时使用文件读取工具从文件系统访问 SKILL.md 和其他文件
3. **高效执行脚本**：工具脚本可通过 bash 执行，无需将完整内容加载到上下文中。只有脚本的输出会消耗 token
4. **大文件无上下文惩罚**：引用文件、数据或文档在实际读取前不会消耗上下文 token

* **文件路径很重要**：Agent 像浏览文件系统一样导航你的 Skill 目录。使用正斜杠（`reference/guide.md`），而非反斜杠
* **文件命名要有描述性**：使用能体现内容的名称：`form_validation_rules.md`，而非 `doc2.md`
* **为可发现性组织结构**：按领域或功能组织目录
  * 好：`reference/finance.md`、`reference/sales.md`
  * 差：`docs/file1.md`、`docs/file2.md`
* **打包完整的资源**：包含完整的 API 文档、丰富的示例、大型数据集；在被访问前不会产生上下文开销
* **对确定性操作优先使用脚本**：编写 `validate_form.py`，而不是让 Agent 生成校验代码
* **明确执行意图**：
  * "运行 `analyze_form.py` 来提取字段"（执行）
  * "参见 `analyze_form.py` 了解提取算法"（作为参考阅读）
* **测试文件访问路径**：通过真实请求验证 Agent 能否导航你的目录结构

**示例：**

```
bigquery-skill/
├── SKILL.md (overview, points to reference files)
└── reference/
    ├── finance.md (revenue metrics)
    ├── sales.md (pipeline data)
    └── product.md (usage analytics)
```

当用户询问营收时，Agent 读取 SKILL.md，看到对 `reference/finance.md` 的引用，并通过 bash 仅读取该文件。sales.md 和 product.md 仍保留在文件系统上，在需要之前不消耗任何上下文 token。正是这种基于文件系统的模型实现了渐进式披露。Agent 可以导航并按需精确加载每个任务所需的内容。

关于技术架构的完整细节，请参阅 Skill 概览中的 [How Skills work](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#how-skills-work)。

### MCP 工具引用

如果你的 Skill 使用 MCP（Model Context Protocol）工具，始终使用完全限定的工具名，以避免“找不到工具”错误。

**格式**：`ServerName:tool_name`

**示例**：

```markdown  theme={null}
Use the BigQuery:bigquery_schema tool to retrieve table schemas.
Use the GitHub:create_issue tool to create issues.
```

其中：

* `BigQuery` 和 `GitHub` 是 MCP 服务名
* `bigquery_schema` 和 `create_issue` 是这些服务中的工具名

如果没有服务前缀，尤其是在存在多个 MCP 服务时，Agent 可能无法定位工具。

### 不要假设工具已安装

不要假设依赖包已可用：

````markdown  theme={null}
**差的示例：假设已安装**：
"Use the pdf library to process the file."

**好的示例：明确依赖**：
"Install required package: `pip install pypdf`

Then use it:
```python
from pypdf import PdfReader
reader = PdfReader("file.pdf")
```"
````

## 技术说明

### YAML frontmatter 要求

SKILL.md 的 frontmatter 需要 `name`（最多 64 个字符）和 `description`（最多 1024 个字符）字段。关于完整的结构详情，请参阅 [Skill 概览](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#skill-structure)。

### Token 预算

为保证最佳性能，SKILL.md 正文保持在 500 行以内。如果内容超出，请使用前述渐进式披露模式拆分到独立文件。关于架构细节，请参阅 [Skill 概览](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#how-skills-work)。

## 高效 Skill 检查清单

分享 Skill 之前，请确认：

### 核心质量

* [ ] 描述具体且包含关键词
* [ ] 描述同时包含 Skill 的功能和使用时机
* [ ] SKILL.md 正文在 500 行以内
* [ ] 额外细节已拆分到独立文件（如需要）
* [ ] 无时效性信息（或已放入“旧模式”章节）
* [ ] 全文术语保持一致
* [ ] 示例具体而非抽象
* [ ] 文件引用仅一层深度
* [ ] 合理使用渐进式披露
* [ ] 工作流步骤清晰

### 代码与脚本

* [ ] 脚本负责解决问题，而非推给 Agent
* [ ] 错误处理明确且有帮助
* [ ] 无“魔法常量”（所有值都有依据）
* [ ] 所需依赖已在说明中列出并验证可用
* [ ] 脚本有清晰的文档
* [ ] 无 Windows 风格路径（全部使用正斜杠）
* [ ] 关键操作包含校验/验证步骤
* [ ] 对质量要求高的任务包含反馈闭环

### 测试

* [ ] 已创建至少三个评估用例
* [ ] 已在 Haiku、Sonnet 和 Opus 上测试
* [ ] 已通过真实使用场景测试
* [ ] 已纳入团队反馈（如适用）

## 下一步

<CardGroup cols={2}>
  <Card title="Get started with Agent Skills" icon="rocket" href="https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart">
    Create your first Skill
  </Card>

  <Card title="Use Skills in Claude Code" icon="terminal" href="https://code.claude.com/docs/en/skills">
    Create and manage Skills in Claude Code
  </Card>

  <Card title="Use Skills with the API" icon="code" href="https://platform.claude.com/docs/en/build-with-claude/skills-guide">
    Upload and use Skills programmatically
  </Card>
</CardGroup>
