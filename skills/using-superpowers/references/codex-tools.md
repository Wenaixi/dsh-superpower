## 分发 subagent 需要多 agent 支持

请在你的 Codex 配置（`~/.codex/config.toml`）中添加：

```toml
[features]
multi_agent = true
```

这将启用 `dispatching-parallel-agents` 与 `subagent-driven-development` 等技能所使用的多 agent 工具。
你具体获得哪些工具，取决于你的模型预设所选的多 agent 版本（当前预设运行 V2；较旧的预设运行 V1）。当实际工具列表与任何表格（包括本表）不一致时，请以你的实际工具列表为准。

- **创建（Spawning）：** 通过 `spawn_agent {fork_turns: "none"}` 为子级提供干净的上下文；默认的 `"all"` 会将你的全部对话记录复制到子级中。在 Codex 0.145+ 上，`~/.codex/agents/` 下的角色文件会通过 `agent_type` 附加到隔离的 fork 上。全历史 fork 接受 `model` 与 `reasoning_effort` 覆盖（此处仅拒绝 `agent_type`）——隔离 fork 是 SDD 保证上下文纯净的默认选项，而非由于覆盖参数的硬性要求。
- **修复轮次（Fix rounds）：** 使用 `followup_task` 唤醒实现者——它会传递你的消息、触发一个交互轮次，并透明地重新加载被 harness 换出的子级。绝不要因为认为已生成的 agent 无法再次通信就去分发全新的实现者；在 V2 上始终可以向其发送后续消息。
- **生命周期（Lifecycle）：** V2 没有 `close_agent`。当需要释放槽位时，已完成的子级会自动被换出；保持它们未关闭没有任何额外开销。只有 V1 会话才有 `close_agent`——在 V1 中，当 reviewer 返回评审意见后关闭 reviewer，并在每个任务的评审通过后关闭该任务的实现者。
- **模型名称（Model names）：** 绝不要把技能、表格或旧会话中的模型名称直接复制到 `spawn_agent` 中，而不对照当前生成的白名单进行检查——V2 仅接受支持 V2 的预设，对其余名称会报硬错误。

## 等待子级（Waiting on children）

`wait_agent` 是一种事件订阅机制，而不是轮询：一旦子级产生邮箱活动，长时间等待就会立即被唤醒，其延迟与短时间等待完全相同。短超时轮询不仅毫无益处，而且每次轮询都会消耗一次工具调用和上下文重新计费。在实测会话中，大约有三分之二的等待调用都是超时的短轮询。

- 当你本地仍有工作要做时，完全不需要等待。已完成子级的最终答复会被推送到你的邮箱中，并随你的下一个轮次一同到达。
- 当你确实处于空闲状态且有未决子级时，请按有界时长进行等待：调用 `wait_agent` 并设置 `timeout_ms` 为 300000-600000（5-10 分钟）。在每个等待区间结束后（无论是被唤醒还是超时），输出一行状态，运行 `list_agents`，并追查任何未汇报就已结束的子级。绝不要堆叠短于 5 分钟的轮询；事件订阅在有界时长下的唤醒速度与短轮询一样快。
- 完成通知邮件无法唤醒空闲的控制器（它在投递时不会触发新的轮次）；覆盖该空闲窗口是 `wait_agent` 的唯一职责。无任何活动的超时等待是你进行状态对账的信号，而不是缩短下一次等待区间的理由。

## 分发时的模型路由（Model routing on spawns）

你发出的每一次 `spawn_agent`——包括当你本身作为一个生成的子级正在执行扇出时——都必须根据你正在执行的技能的“模型选择”规则，显式设置 `model` 和 `reasoning_effort`。仅设置 `model` 是一个陷阱：子级的推演深度会静默重置为该模型的默认值，而不是继承你的设置。

建议请你的 human partner 在 `~/.codex/config.toml` 中添加机器级兜底配置，以便任何遗漏设置的分发调用仍能路由到既定层级，而不是静默继承当前会话最昂贵的模型：

```toml
[agents]
default_subagent_model = "<你的分发白名单中的中端模型>"
default_subagent_reasoning_effort = "medium"
```

## 环境探测（Environment Detection）

创建 worktree 或完成分支的技能，在继续操作前应使用只读 git 命令探测其运行环境：

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

- `GIT_DIR != GIT_COMMON` → 当前已处于关联的 worktree 中（跳过创建）
- `BRANCH` 为空 → 分离 HEAD 状态（无法从沙箱中进行分支创建/推送/PR 操作）

关于每个技能如何使用这些信号，请参阅 `using-git-worktrees` 步骤 0 与 `finishing-a-development-branch` 步骤 1。

## Codex App 收尾（Codex App Finishing）

当沙箱阻止分支或推送操作时（外部管理的 worktree 中的分离 HEAD 状态），agent 应提交所有工作并提示用户使用 App 的原生控件：

- **"Create branch"** — 为分支命名，然后通过 App 界面进行提交/推送/创建 PR
- **"Hand off to local"** — 将工作成果转交到用户的本地检出中

此时 agent 仍可运行测试、暂存文件，并输出建议的分支名称、提交信息与 PR 描述供用户复制使用。
