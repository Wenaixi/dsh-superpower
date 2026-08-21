# DSH Tools Reference for Superpowers

> 面向模型的 DSH 工具速查。Superpowers 原版文案中的 Claude Code / Codex 工具名在此映射为 DSH 等价物。
> 当 skill 指示使用某一工具时，按下表替换即可。

## 核心映射

| 原版提及 | DSH 等价 | 备注 |
|---|---|---|
| `Bash` / `bash` | `pwsh`（首选，Windows 友好）或 `bash` | 长耗时命令用 `run_in_background: true`，通过 `job_output` / `job_list` 收敛 |
| `Read` / `Write` / `Edit` | `fs` 工具的 `read` / `write` / `edit` | `read` 前无需 `fs/observed` 校验，`write/edit` 自动触发 `fs/observed` 失效 |
| `Glob` / `Grep` / `Grep -R` | `fs-search` 工具的 `glob` / `grep` | `glob` 发现文件，`grep` 搜内容；大仓用 `include` 过滤 |
| `Task` / `Subagent` | `subagent` / `subagent_fork` / `workflow` | 单任务派发用 `subagent`，多阶段扇出用 `workflow`（`agent`/`pipeline`/`parallel`） |
| `AskUserQuestion` | `ask-user` | 阻塞式提问，遵守 `userQuestions` 策略 |
| `TodoWrite` | `todo` | 每次提供全量列表，`in_progress` 至少一项 |
| `Skill` | `skill` | `skill(name)` 加载 `<skill_content>`，与 `ctx.skills.get()` 同源 |
| `WebSearch` / `WebFetch` | `web` 工具 | `web_search` + `web_fetch_exa` 已封装为统一 `web` |
| `/skill superpowers:<name>` | `skill` 工具或用户显式 `/skill` 命令 | 两种路径渲染一致的 `<skill_content>` |
| `git worktree` | `bash` / `pwsh` 中直接执行 `git worktree` | DSH 无 worktree 专属封装，按原命令执行 |

## DSH 专属能力（原版无直接对应）

| DSH 能力 | 何时用 |
|---|---|
| `goal` / `ralph` | 长周期目标的创建、续跑、阻塞判定 |
| `workflow` 脚本 | 需要编排数十个 subagent 的审计/迁移/批量改写 |
| `jobs` | 托管后台任务的查询与终止 |
| `plan-mode` | 只读规划锁定，与 `writing-plans` 的细粒度切片互补 |
| `cordis` 动态插件 | 会话内临时扩展能力（非本移植包范畴） |

## 约束与习惯

- 沙箱默认 `danger-full-access`，但仍需在 skill 中标注文件路径为绝对路径或相对 `cwd` 可解析路径。
- PowerShell 中 `ls -la` / `head` 等 Unix 别名不可用，用 `Get-ChildItem` / `Select-Object -First N`。
- 工具 `execute` 返回结构化 JSON，面向人类的渲染放在 `output.render`（对 skill 编写者）。
- 所有 `waterfall` 事件监听必须调用 `next()`，否则短路下游。

## 最小示例

```text
用户：帮我加一个重试工具
模型：Using superpowers:brainstorming to clarify requirements
      -> 调用 skill(name="brainstorming")
      -> 按 skill 流程提问、分类 Spike/Bounded/Architectural
      -> 设计获批后调用 skill(name="writing-plans") 切片
      -> 每切片派发 subagent(prompt="实现 task-03...") 并用 todo 跟踪
```
