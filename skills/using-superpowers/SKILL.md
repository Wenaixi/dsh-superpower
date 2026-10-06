---
name: using-superpowers
description: "Superpower Skill: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions"
description_zh: "Superpower Skill：适用于任何对话开始前，建立技能查找与调用规范，要求在任何回复前优先调用相关技能，包括澄清问题。"
---


<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## The Rule

**Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.

**Before entering plan mode:** if you haven't already brainstormed, invoke the brainstorming skill first.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out. Brainstorming and systematic-debugging are Superpowers' most common process skills, but the rule holds for any of them.

- "Let's build X" → superpowers:brainstorming first, then implementation skills.
- "Fix this bug" → superpowers:systematic-debugging first, then domain skills.

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |

## Skill Switches

Each of the 15 skills in this bundle has one switch on the detail page of the `@wenaixi/dsh-superpower` card in the DSH Web GUI plugin manager:

- **Model invocable:** when off, the skill no longer appears in the model's available skill catalog and `skill` tool calls are rejected.
- **User invocable:** when off, the skill no longer appears in slash-command completion or the CLI skill list.

Toggles take effect immediately; the current turn is unaffected, and the next turn sees the new catalog. State is stored in the profile's `cordis.patch.yml` under the `disabled` table.

## Platform Adaptation

This bundle is designed natively for **DSH (DeepSeek Harness)** and supports only the DSH platform:

- DSH tool mapping: `references/dsh-tools.md` — every skill in this bundle assumes DSH tools (Bash -> pwsh/bash, Read/Write/Edit -> fs, Glob/Grep -> fs-search, Task/Subagent -> subagent/workflow, TodoWrite -> todo, AskUserQuestion -> ask-user, Skill -> skill).
## User Instructions

User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.
