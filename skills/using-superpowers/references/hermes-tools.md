# Hermes Agent 工具映射

技能通常以抽象动作表述（例如“分发 subagent”、“创建待办项”、“读取文件”）。在 Hermes Agent 上，这些动作对应下表中的具体工具。

## 工具列表

| 技能请求的动作 | Hermes 等价工具 |
|---|---|
| 读取文件 | `read_file` |
| 创建新文件 | `write_file` |
| 编辑文件（精准 patch） | `patch` |
| 运行 shell 命令 | `terminal` |
| 搜索文件内容 | `search_files` |
| 按名称查找文件 | 使用 `terminal` 运行 `find` |
| 获取 URL / 读取网页 | `web_extract(urls=[...])` |
| 搜索网络 | `web_search(query=...)` |
| 分发 subagent | `delegate_task(goal=..., context=..., toolsets=[...], role="leaf")` |
| 任务跟踪 | `todo` 工具 |
| 调用技能 | `skill_view("skill-name")` |

## 指令文件（Instructions file）

当技能提到“你的指令文件”时，在 Hermes Agent 上指的是项目目录中的 **`AGENTS.md`**，或全局位于 `~/.hermes/SOUL.md` 的 **`SOUL.md`**。

## 调用技能

Hermes Agent 配备包含 `skill_view` 与 `skills_list` 工具的 `skills` 工具集。
要调用 superpowers 技能，请使用：

```
skill_view("brainstorming")
skill_view("test-driven-development")
```

若 `skill_view` 找不到对应的 superpowers 技能（在插件完成完全注册前可能不会出现在目录中），可直接降级为读取 SKILL.md 文件：

```
read_file(path="~/.hermes/plugins/superpowers/skills/<skill-name>/SKILL.md")
```

此降级方案与缺少原生技能加载能力的其他宿主所使用的机制相同。

## Subagent 分发

使用 `delegate_task` 创建隔离的 subagent 以处理并行或串行工作流：

```
delegate_task(goal="...", context="...", toolsets=[...], role="leaf")
```

若 `delegate_task` 不可用，请在当前会话中内联执行工作，而不要凭空编造工具调用。

## 任务跟踪

在会话内使用 `todo` 工具跟踪任务进度。对于多 agent 任务看板，可使用 `hermes kanban` CLI（若可用）。将早期文档中出现的 `TodoWrite` 统一视为上述任务跟踪动作。
