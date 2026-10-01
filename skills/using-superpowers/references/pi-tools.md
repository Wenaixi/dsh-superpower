# Pi 工具映射

技能通常以抽象动作表述（例如“分发 subagent”、“创建待办项”、“读取文件”）。在 Pi 上，这些动作对应下表中的具体工具。

| 技能请求的动作 | Pi 等价工具 |
| --- | --- |
| 分发 subagent (`Subagent (general-purpose):` 模板) | 若可用，使用已安装的 subagent 工具（例如来自 `pi-subagents` 的 `subagent`） |
| 任务跟踪（“创建待办”、“标记完成”） | 若可用，使用已安装的 todo/task 工具，否则在计划文档或 `TODO.md` 中跟踪任务 |

## Subagents

Pi 核心并未随附标准 subagent 工具。`pi-subagents` 扩展包是一个强大的可选伴侣组件，它提供了支持单 agent、链式、并行、异步、fork 上下文及恢复/状态工作流的 `subagent` 工具。若当前环境未安装 subagent 工具，切勿凭空构造 `Task` 调用；请在当前会话中按序串行执行，或说明未安装该可选 subagent 能力。

## 任务列表（Task lists）

Pi 核心并未随附标准任务列表工具。若已安装 todo/task 扩展，请使用其文档所说明的工具。否则，请使用 Superpowers 计划文件、Markdown 检查清单或仓库本地的 `TODO.md` 进行任务跟踪。早期 Superpowers 文档可能提及 `TodoWrite`；请统一按上述任务跟踪动作处理。
