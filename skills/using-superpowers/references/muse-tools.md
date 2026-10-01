# Muse 工具映射

技能以动作表述（"派发 subagent"、"创建待办"、"读取文件"）。在 Muse 上，这些动作对应下表工具。

| 技能要求的动作 | Muse 等价 |
|----------------------|----------------|
| 读取文件 | `read_file` |
| 读取多个文件 | `read_file`（多次调用）或 `search` |
| 创建新文件 | `write_file` |
| 编辑文件 | `edit_file` |
| 运行 shell 命令 | `bash` |
| 搜索文件内容 | `search` |
| 按名称查找文件 | 带 `glob` 的 `search` |
| 抓取 URL | `web_fetch` |
| 搜索网络 | `web_search` |
| 调用技能 | 对 `skills/<name>/SKILL.md` 使用 `read_file`，或使用原生技能工具 |
| 派发 subagent（`Subagent (general-purpose):` 模板） | 用填充的提示词调用 `subagent_spawn` |
| 任务跟踪（"创建待办"、"标记完成"） | `write_todos` 或 `bash` 任务文件 |
| 向用户提问 | `request_user_input` |

## 指令文件

当技能提及"你的指令文件"时，在 Muse 上即项目根目录的 **`CLAUDE.md`** 或 **`AGENTS.md`**。Muse 在配置处按层级加载这些文件。

## 技能调用

Muse 通过 `muse skills` 提供原生技能支持。要调用 Superpowers 技能，读取其 `SKILL.md` 并遵循其中的说明。引导技能（using-superpowers）会通过插件钩子在 `SessionStart` 时自动注入——你已在遵循它，无需重新加载。

## subagent 派发

使用 `subagent_spawn` 将工作委派给隔离的 subagent。派发前先填充提示词模板（如 `implementer-prompt.md`、`task-reviewer-prompt.md`）。若没有可用的 subagent 工具，就在当前会话内联完成工作，而不是臆造工具调用。

## 任务跟踪

使用 `write_todos` 跟踪清单。技能清单中的每一项创建一个待办，随进度标记 in_progress/completed。若 `write_todos` 不可用，通过 `write_file`/`edit_file` 维护一个 Markdown 任务文件。