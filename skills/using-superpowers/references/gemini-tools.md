# Gemini CLI 工具映射

技能通常以抽象动作表述（例如“分发 subagent”、“创建待办项”、“读取文件”）。在 Gemini CLI 上，这些动作对应下表中的具体工具。

| 技能请求的动作 | Gemini CLI 等价工具 |
|----------------------|----------------------|
| 读取文件 | `read_file` |
| 一次读取多个文件 | `read_many_files` |
| 创建新文件 | `write_file` |
| 编辑文件 | `replace` |
| 运行 shell 命令 | `run_shell_command` |
| 搜索文件内容 | `grep_search` |
| 按名称查找文件 | `glob` |
| 列出文件与子目录 | `list_directory` |
| 获取网页内容 | `web_fetch` |
| 搜索网络 | `google_web_search` |
| 调用技能 | `activate_skill` |
| 分发 subagent (`Subagent (general-purpose):` 模板) | 调用 `invoke_agent` 并传入 `agent_name: "generalist"`（可通过 `@generalist` 聊天语法调用——详见[Subagent 支持](#subagent-支持)） |
| 多个并行分发 | 在同一回复中发起多个 `invoke_agent` 调用 |
| 任务跟踪（“创建待办”、“标记完成”） | `write_todos`（状态包括：pending, in_progress, completed, cancelled, blocked） |

## 指令文件（Instructions file）

当技能提到“你的指令文件”时，在 Gemini CLI 上指的是 **`GEMINI.md`**。Gemini CLI 采用层级方式加载 `GEMINI.md`：全局文件位于 `~/.gemini/GEMINI.md`，项目级文件位于工作区目录及其上级目录，当工具访问子目录中的文件时，还会加载该子目录下的 `GEMINI.md`。

## 个人技能目录（Personal skills directory）

用户级技能存放在 **`~/.gemini/skills/`**，同时以 **`~/.agents/skills/`** 作为跨运行时别名（与 Codex 和 Copilot CLI 共享）。当同一作用域内两个目录同时存在时，`.agents/skills/` 优先级更高。每个技能都是一个包含 `SKILL.md`（带有 `name` 与 `description` frontmatter）的子目录。

## Subagent 支持

Gemini CLI 通过 `invoke_agent` 工具分发 subagent，该工具接受 `agent_name` 与 `prompt` 参数。相同的分发操作也可以通过聊天语法快捷触发：输入 `@generalist <prompt>` 等价于调用 `invoke_agent` 并传入 `agent_name: "generalist"`。内置 agent 名称包括 `generalist`、`cli_help`、`codebase_investigator`，以及在启用浏览器工具时的 `browser_agent`。

技能通过 `Subagent (general-purpose):` 格式进行分发，要么引用 prompt 模板文件（例如 `subagent-driven-development` 的 `./implementer-prompt.md`），要么直接提供内联 prompt。在 Gemini CLI 上：

| 技能分发形式 | Gemini CLI 等价方式 |
|---------------------|----------------------|
| 引用 `*-prompt.md` 模板（implementer, task-reviewer, code-reviewer 等） | 填充模板内容，然后调用 `invoke_agent`，传入 `agent_name: "generalist"` 及填充后的 prompt |
| 引用 `requesting-code-review` 的 `./code-reviewer.md` | 调用 `invoke_agent`，传入 `agent_name: "generalist"` 及填充后的评审模板 |
| 内联 prompt（未引用模板） | 调用 `invoke_agent`，传入 `agent_name: "generalist"` 及内联 prompt |

### Prompt 填充

技能提供的 prompt 模板中包含形如 `{WHAT_WAS_IMPLEMENTED}` 或 `[FULL TEXT of task]` 的占位符。在将完整 prompt 传递给 `invoke_agent` 之前，请先替换所有占位符。prompt 模板本身已包含 agent 的角色职责、评审标准及预期输出格式——subagent 会严格遵循。

### 并行分发

Gemini CLI 支持并行 subagent 分发。在同一回复中发起多个 `invoke_agent` 调用（或在一个 prompt 中多次调用 `@generalist`），即可并行运行互不依赖的 subagent 任务。对于存在依赖关系的任务需保持串行，但切勿仅为了保持对话历史整洁而把相互独立的 subagent 任务串行化。

## 其他 Gemini CLI 工具

以下工具为 Gemini CLI 所特有：

| 工具 | 用途 |
|------|---------|
| `save_memory` (旧版) | 当 `experimental.memoryV2 = false` 时跨会话持久化信息 |
| `get_internal_docs` | 查阅 Gemini CLI 内置捆绑文档 |
| `ask_user` | 向用户提出结构化问题（文本 / 单选 / 多选） |
| `enter_plan_mode` / `exit_plan_mode` | 进入或退出只读计划模式 |
| `update_topic` | 更新当前对话的主题或战略意图元数据 |
| `complete_task` | 标记 Gemini subagent 已完成并将结果返回给父 agent |
| `tracker_create_task`, `tracker_update_task`, `tracker_get_task`, `tracker_list_tasks`, `tracker_add_dependency`, `tracker_visualize` | 支持依赖关系与可视化的高级任务跟踪器 |
| `read_mcp_resource`, `list_mcp_resources` | MCP 资源访问 |
