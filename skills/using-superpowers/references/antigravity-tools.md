# Antigravity CLI (`agy`) 工具映射

技能通常以抽象动作表述（例如“分发 subagent”、“创建待办项”、“读取文件”）。在 Antigravity CLI (`agy`) 上，这些动作对应下表中的具体工具。

| 技能请求的动作 | Antigravity CLI 等价工具 |
|----------------------|----------------------|
| 分发 subagent (`Subagent (general-purpose):` 模板) | 使用内置 `TypeName` 调用 `invoke_subagent`——全能力工作使用 `self`，只读任务使用 `research` |
| 任务跟踪（“创建待办”、“标记完成”） | **task artifact**——调用 `write_to_file` 并传入 `IsArtifact: true` 与 `ArtifactType: "task"`（详见[任务跟踪](#任务跟踪)）。**切勿**使用 `manage_task`，后者用于管理后台进程。 |

## 任务跟踪

Antigravity **没有内置待办工具**（`manage_task` 用于管理后台进程——`list`/`kill`/`status`/`send_input`——它*不是*检查清单）。当技能要求创建待办列表或跟踪任务时，请维护一个 **task artifact**：通过 `write_to_file` 保存 Markdown 检查清单（`IsArtifact: true`，`ArtifactMetadata.ArtifactType: "task"`），后续随着进度使用 `replace_file_content` / `multi_replace_file_content` 进行编辑更新。

在任何多步骤任务开始时，创建 task artifact 并列出计划中的每一个步骤。每完成一步，编辑该 artifact 将其标记为已完成（`- [x]`）。若计划发生变更，同步更新检查清单。请始终保持其最新状态——它是你确认剩余任务的唯一真实来源；一旦对话变长，在开始每一步前请重新阅读它。
