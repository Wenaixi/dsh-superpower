---
name: superpower-using-superpowers
description: "适用于任何对话开始前，建立技能查找与调用规范，要求在任何回复前优先调用相关技能，包括澄清问题"
---

<SUBAGENT-STOP>
如果你是作为子代理被派来执行特定任务，请忽略本技能。
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
如果你认为有哪怕 1% 的可能性某个技能适用于你当前要做的事，你就**必须**调用该技能。

如果某项任务适用某个技能，你别无选择，必须使用它。

这没有商量余地，你不能为自己找借口绕开它。
</EXTREMELY-IMPORTANT>

## 规则

**在任何回复或行动之前先调用相关或被请求的技能**——包括澄清问题、探索代码库或检查文件。如果事后发现不适用于当前情况，可以不使用它。

**进入规划模式之前：** 如果尚未进行头脑风暴，请先调用头脑风暴技能。

然后宣告 "Using [skill] to [purpose]" 并严格按技能要求执行。如果技能包含清单，请为每一项创建一个待办。

## 技能优先级

当多个技能同时适用时，流程类技能优先——它们决定方法论，然后由实现类技能（如 frontend-design 等）负责落地。头脑风暴与系统化调试是 Superpowers 中最常见的流程技能，但该规则适用于所有技能。

- "Let's build X" → 优先使用 superpower-brainstorming，再使用实现类技能。
- "Fix this bug" → 优先使用 superpower-systematic-debugging，再使用领域技能。

## 警示信号

出现以下想法时请立刻停下——你正在为自己找借口：

| 想法 | 现实 |
|---------|---------|
| "这只是个简单问题" | 问题也是任务，先检查技能。 |
| "我需要先了解更多上下文" | 技能检查应在澄清问题之前。 |
| "我先探索一下代码库" | 技能会告诉你如何探索，先检查技能。 |
| "我可以快速看一下 git/文件" | 文件缺少对话上下文，先检查技能。 |
| "我先收集一下信息" | 技能会告诉你如何收集信息。 |
| "这不需要正式的技能" | 只要技能存在，就要用。 |
| "我记得这个技能" | 技能会演进，请阅读当前版本。 |
| "这不算任务" | 有行动就是任务，检查技能。 |
| "用技能太小题大做了" | 简单的事情也会变复杂，请使用技能。 |
| "我就先做这一件事" | 做任何事之前先检查。 |
| "这样做感觉很高效" | 无章法的行动只会浪费时间，技能可以避免。 |
| "我知道那是什么意思" | 知道概念不等于会用技能，请调用它。 |

## 平台适配

如果你的执行环境出现在此列表中，请先阅读对应的参考文件获取专项说明：

- DSH (DeepSeek Harness): `references/dsh-tools.md` — **请优先阅读。** 将 Bash→pwsh/bash、Read/Write/Edit→fs、Glob/Grep→fs-search、Task/Subagent→subagent/workflow、TodoWrite→todo、AskUserQuestion→ask-user、Skill→skill 进行映射。本套件中的所有技能均假定使用 DSH 工具。
- Codex: `references/codex-tools.md`
- Pi: `references/pi-tools.md`
- Antigravity: `references/antigravity-tools.md`
- Hermes Agent: `references/hermes-tools.md`

## 用户指令

用户指令（CLAUDE.md、AGENTS.md、GEMINI.md 等，以及直接请求）的优先级高于技能，技能又高于默认行为。仅当人类协作方明确指示时，才可跳过技能工作流或指令。
