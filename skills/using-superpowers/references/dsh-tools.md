# DSH Tools Reference for Superpowers

> Model-facing DSH tool quick reference. Native tool equivalents and behavior conventions for Superpowers skills on the DSH platform.
> When a skill directs a specific tool action, execute it with the native DSH tool from this table.

## Core Mapping

| Skill action | DSH equivalent | Notes |
|---|---|---|
| `Bash` / `bash` | `pwsh` (preferred, Windows-friendly) or `bash` | Long-running commands use `run_in_background: true`; collect with `job_output` / `job_list` |
| `Read` / `Write` / `Edit` | `fs` tool's `read` / `write` / `edit` | No `fs/observed` check needed before `read`; `write`/`edit` trigger `fs/observed` invalidation automatically |
| `Glob` / `Grep` / `Grep -R` | `fs-search` tool's `glob` / `grep` | `glob` finds files, `grep` searches content; use `include` filters on large repos |
| `Task` / `Subagent` | `subagent` / `subagent_fork` / `workflow` | Single-task dispatch uses `subagent`; multi-stage fan-out uses `workflow` (`agent`/`pipeline`/`parallel`) |
| `AskUserQuestion` | `ask-user` | Blocking question, obeying `userQuestions` policy |
| `TodoWrite` | `todo` | Always provide the full list; at least one `in_progress` |
| `Skill` | `skill` | `skill(name)` loads `<skill_content>`, same source as `ctx.skills.get()` |
| `WebSearch` / `WebFetch` | `web` tool | `web_search` + `web_fetch` wrapped into one `web` |
| `/skill <name>` | `skill` tool or the user's explicit `/skill` command | Both paths render the same `<skill_content>` |
| `git worktree` | run `git worktree` directly in `bash` / `pwsh` | DSH has no worktree-specific wrapper; run the plain command |

## DSH-Specific Capabilities (no direct original equivalent)

| DSH capability | When to use |
|---|---|
| `goal` / `ralph` | Creating, resuming, or blocking on long-horizon goals |
| `workflow` scripts | Orchestrating dozens of subagents for audits/migrations/bulk rewrites |
| `jobs` | Querying and terminating managed background jobs |
| `plan-mode` | Read-only planning lock, complementing writing-plans' fine-grained slicing |
| `cordis` dynamic plugins | Extending capabilities mid-session (outside this bundle's scope) |

## Constraints and Habits

- Sandbox defaults to `danger-full-access`, but still annotate file paths in skills as absolute or resolvable relative to `cwd`.
- Unix aliases like `ls -la` / `head` are unavailable in PowerShell; use `Get-ChildItem` / `Select-Object -First N`.
- Tool `execute` returns structured JSON; human-facing rendering lives in `output.render` (for skill authors).
- Every `waterfall` event listener must call `next()`, or downstream short-circuits.

## Minimal Example

```text
User: Help me add a retry tool
Model: Using brainstorming to clarify requirements
       -> call skill(name="brainstorming")
       -> follow the skill's flow to ask questions, classify Spike/Bounded/Architectural
       -> after design approval, call skill(name="writing-plans") to slice
       -> dispatch subagent(prompt="implement task-03...") per slice and track with todo
```