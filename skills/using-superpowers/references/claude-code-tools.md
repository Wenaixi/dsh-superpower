# Claude Code 工具说明

Claude Code 是参考宿主：技能以其词汇表表述（`Agent` 用于派发 subagent、todos 表示待办、`Skill` 表示技能）。本文说明 Claude Code 中唯一能让技能运行成本低于默认形态的场景，该场景由 human partner 决定是否启用，不影响技能的任何既有要求。

## subagent 驱动开发的低成本编排

控制会话是 subagent-driven-development 运行中最昂贵的席位：它读取每一次派发结果与每一份报告，且通常运行在会话最强的模型上。Claude Code 支持嵌套 subagent（默认比主对话低三层，`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` 可调整），因此整个循环可以整体下移一层运行。

当 human partner 提出要求——或表示会话模型过于昂贵、不宜用于协调——就派发一个运行在中层模型上的编排 subagent，附上计划路径与"端到端使用 subagent-driven-development"的指令。编排者按该技能的模型选择条款派出自己的实现者与 reviewer；workspace 与 ledger 都在磁盘上，不会因多出的这一层而丢失任何内容。其最终消息必须原样携带 "Rulings I made" 清单——这份清单是决策到达 human partner 的途径，你要转达它，而不是概括它。

仅对完整计划这样做。嵌套单个任务的派发毫无收益，只会多占一个席位。