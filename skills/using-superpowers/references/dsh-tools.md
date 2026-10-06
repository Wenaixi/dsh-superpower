# DSH Tools Reference for Superpowers

> Model-facing DSH tool reference, verified against the installed runtime:
> **DSH 0.2.0-rc.2 (desktop-runtime), cordis 4.0.4, every @deepseek-ai/* package at 0.2.0-rc.2**.
> Tool *availability* depends on assembly (bundle layers + profile patch); this page lists every registered
> tool name, its owning package, and the assembly condition that decides whether it appears in a session.
> The desktop profile anchor below is what a stock DSH desktop session actually exposes.
> Before trusting any row here against a different DSH version, re-verify it: follow the dsh-plugin-dev skill's
> source-verification-and-caches.md (layer 1 first: installed package sources, hit-and-stop), and read the
> owning package's lib/*.js for the exact schema and behavior.

## Core Mapping

The left column is the generic action name Superpowers skills use; the right column is the DSH tool that implements it.

| Skill action | DSH equivalent | Notes |
|---|---|---|
| `Bash` / `bash` | `pwsh` | `pwsh` is the shell tool on Windows; `bash` registers only in non-Windows assemblies. Long-running commands use `run_in_background: true` (when the `ctx.jobs` service is assembled) and are collected with `job_output` / `job_list`; a foreground call that outlives `timeoutMs` is promoted to a background job instead of being killed (`promoteOnTimeout`, default true). |
| `Read` / `Write` / `Edit` | `read` / `write` / `edit` | fs-observation-policy applies: `read` needs no prior check, but `write` and `edit` require the target to have been observed first (read, read_image, write, or edit records an observation). Writing an existing file that was never read fails with `FS_NOT_OBSERVED`; a file that changed since it was read fails with `FS_STALE_VERSION`. Successful writes/edits record the new version automatically. |
| `Glob` / `Grep` / `Grep -R` | `glob` / `grep` | `glob` finds paths by pattern (hidden and ignored files included), `grep` searches content (ripgrep syntax, up to 250 matches, overflow spilled to a saved file). Use `include` filters on large repos. |
| `Task` / `Subagent` | `subagent` / `subagent_fork` | Two instances of the same plugin (`dsh-tool-subagent`): `subagent` rides the `spawn` provider, `subagent_fork` rides `fork` (inherits this conversation's completed history). There is no always-on `workflow` tool: `workflow` registers only when a `workflowEngine` service is assembled (see delegated tools below). |
| `AskUserQuestion` | `ask_user_question` | Blocking by default; a `mode: timed` assembly adds `wait_seconds` (default 120, -1 to wait indefinitely) and a pending/answer duality. Obey the `userQuestions` channel always. |
| `TodoWrite` | `todo_write` | Whole-list replacement, logged per call. Content must be non-empty and unique; at most one `in_progress` item unless `allowParallelInProgress: true` is assembled. |
| `Skill` | `skill` | `skill(name)` resolves through `ctx.skills.list/get` — the same catalog the `/skill` user command and the session skill catalog read. A user slash invocation injects the identical `<skill_content>`. |
| `WebSearch` / `WebFetch` | `web_search` / `web_fetch` | Two independent tools — there is no combined `web` tool. Both execute through the `ctx.web` seam; the search backend is pluggable (deepseek-official by default, modsearch as a provider bounce). |
| `/skill <name>` | `skill` tool or the user's explicit `/skill` command | Both paths render the same `<skill_content>`; a user invocation also marks the skill's catalog entry as user-invocable. |
| `git worktree` | run `git worktree` directly in `pwsh` | DSH has no worktree-specific wrapper; run the plain command. |

## Complete Tool Catalog

Every model-facing tool registered by the DSH platform packages, with its owning package (all at 0.2.0-rc.2 unless noted),
its repository path (from `package.json` `repository.directory`), and the assembly condition. The desktop anchor is
the tool set actually visible in a stock desktop session (PTC presentation; 41 tools).

```text
run_code                       @deepseek-ai/dsh-tools (packages/core/tools)
pwsh / bash                    @deepseek-ai/dsh-tool-pwsh|dsh-tool-bash (packages/shell/tool-*)
load_workspace_dependencies    @deepseek-ai/dsh-tool-workspace-dependencies (packages/skill/tool-workspace-dependencies)
read / write / edit / read_image   @deepseek-ai/dsh-tool-fs (packages/fs/tool-fs)
glob / grep                    @deepseek-ai/dsh-tool-fs-search (packages/fs/tool-fs-search)
skill                          @deepseek-ai/dsh-tool-skill (packages/skill/tool-skill)
subagent / subagent_fork       @deepseek-ai/dsh-tool-subagent (packages/subagent/tool-subagent)
send_message / interrupt_agent (agent_id form)  @deepseek-ai/dsh-tool-subagent-control (packages/subagent/tool-subagent-control)
list_agents                    @deepseek-ai/dsh-tool-subagent-control/list-agents (same package, sub-entry)
list_subagent_models           @deepseek-ai/dsh-tool-subagent (only with modelSelectionSettings)
spawn_teammate / wait_agent / team_task_create|get|list|update  @deepseek-ai/dsh-experimental-tool-agent-team (packages/experimental/tool-agent-team)
workflow                       @deepseek-ai/dsh-tool-workflow (packages/workflow/tool-workflow, conditional)
ralph                          @deepseek-ai/dsh-tool-ralph (packages/workflow/tool-ralph, disabled by default)
job_output / job_list / job_kill   @deepseek-ai/dsh-tool-jobs (packages/jobs/tool-jobs)
create_goal / get_goal / update_goal  @deepseek-ai/dsh-tool-goal (packages/goal/tool-goal)
exit_plan_mode                 @deepseek-ai/dsh-plan-mode (packages/plan/plan-mode)
ask_user_question              @deepseek-ai/dsh-tool-ask-user (packages/interaction/tool-ask-user)
todo_write                     @deepseek-ai/dsh-tool-todo (packages/todo/tool-todo)
web_search / web_fetch         @deepseek-ai/dsh-tool-web (packages/web/tool-web)
present                        @deepseek-ai/dsh-tool-present (packages/deliverables/tool-present)
schedule_create|list|delete|update   @deepseek-ai/dsh-schedule (packages/schedule/schedule)
list_mcp_resources / list_mcp_resource_templates / read_mcp_resource   @deepseek-ai/dsh-mcp-resources (packages/mcp/mcp-resources)
read_page / x_search           @liustack/modsearch@5.10.5 (third-party bridge, raw JSON-Schema registration)
cordis_inspect_list / cordis_inspect_query  @deepseek-ai/dsh-tool-cordis (packages/extensions/tool-cordis)
```

### Desktop session anchor (verified tool set, PTC presentation)

```text
ask_user_question  create_goal  edit  exit_plan_mode  get_goal  glob  grep
interrupt_agent    job_kill     job_list  job_output   list_agents
list_mcp_resource_templates  list_mcp_resources  load_workspace_dependencies
present            pwsh        read  read_image       read_mcp_resource
read_page          schedule_create  schedule_delete  schedule_list  schedule_update
send_message       skill       spawn_teammate  subagent  subagent_fork
team_task_create   team_task_get  team_task_list  team_task_update
todo_write         update_goal  wait_agent  web_fetch  web_search  write  x_search
```

Notably absent from the desktop anchor: `bash` (non-Windows only), `run_code` (PTC transport — it is the only
directly callable tool in PTC mode but is never listed in the catalog), `workflow` and `ralph` (see below),
and `list_subagent_models` (registration also requires the model-selection policy to resolve).

## Behavior Contracts and Mode Details

### fs-observation-policy (read/write/edit)

Owned by `@deepseek-ai/dsh-fs-observation-policy` + `@deepseek-ai/dsh-fs-local`. A per-session gate records each
authoritative presence/absence observation (emit `fs/observed`) and derives write/edit guards from it:

- `read` and `read_image`: no prior observation required; both record an observation.
- `write`: an unseen target or a confirmed-absent target becomes `createIfAbsent` (no prior read needed to create a new file);
  a confirmed-present target becomes `replaceIfVersion` at the observed version — writing an existing file that was never
  read fails with `FS_NOT_OBSERVED` ("cannot overwrite existing ... without reading it first"). A file changed since the
  observation fails with `FS_STALE_VERSION`.
- `edit`: always requires a prior observation of the target — unseen fails with `FS_NOT_OBSERVED`, confirmed-absent with
  `FS_NOT_FOUND`. The observed version is the CAS basis; drift fails with `FS_STALE_VERSION`.
- Successful writes/edits emit `fs/observed` with the new version, so subsequent edits stay valid.

The tool's guidance text encodes the same rule: "Read an existing file before overwriting it with write" /
"Read a file before editing it (the default fs-observation-policy requires it)".

### Background execution and jobs

- `pwsh`/`bash` (and `subagent`, `workflow`) expose `run_in_background: true` only when the `ctx.jobs` service is
  assembled (base layer: `dsh-jobs-local` + `dsh-tool-jobs`). The parameter then returns a job id immediately.
- A foreground call whose `timeoutMs` expires is *promoted* to a background job (`promoteOnTimeout`, default true when
  backgrounding is enabled) instead of being killed; the result carries `kind: promoted` + `jobId`.
- `job_output` reads the output delta since the previous read for stream jobs, or the settled result of a final-output job;
  output beyond the ring retention spills to files named in the result. `job_list` lists the caller's jobs with status;
  `job_kill` terminates one. Completed jobs deliver an in-session notice ("Done; job_output.") — do not busy-poll.

### Delegated tools: two competing families

- **Subagent continuable family** (`dsh-tool-subagent-control` + `/list-agents`): `send_message`/`interrupt_agent`
  take `agent_id` (your direct continuable child, or your parent when you are a resident child); `list_agents` lists
  direct descendants with `scope: children|descendants`. One-shot children are omitted (they accept neither continuation
  nor delivery).
- **Agent Teams family** (`dsh-experimental-tool-agent-team`): `spawn_teammate`, `wait_agent`,
  `team_task_create|get|list|update`, and *re-registered same-name* `send_message`/`list_agents`/`interrupt_agent`
  taking `target` = member name ("lead" included). The agent-team-profile bundle layer *disables* the
  subagent-control rows, so the two families never coexist: one session exposes either the `agent_id` form or the
  `target` form. Desktop (with the experimental agent-team-profile bundle) exposes the target form.
- `subagent`/`subagent_fork` (the delegation tools themselves) are `dsh-tool-subagent` instances configured with
  `provider: spawn|fork` and distinct `toolName`. `subagent_fork` omits model selection so children inherit the
  parent's route; both support `backgroundMode: continuable`.

### workflow and ralph (conditional)

- `workflow` (`dsh-tool-workflow`) injects `workflowEngine`; the engine is provided by `dsh-workflow-ptc`
  (requires the Node TypeScript PTC runtime). When the engine is absent, the tool does not register. Its description
  restricts use to work that actually fans out ("Use the workflow tool ONLY when the user explicitly asks for a workflow
  or for large multi-agent orchestration").
- `ralph` (`dsh-tool-ralph`) is disabled by default in the base assembly and in the desktop profile; enable it as an
  explicit row before relying on it.

### plan mode and exit_plan_mode

- `dsh-plan-mode` provides the `plan` session projection (logged per-agent collaboration state), the `plan:policy`
  prompt section, and the `/plan` command. The tool catalog stays identical across modes (request-cache stability);
  entering/leaving plan mode changes only the prompt section, not the tool set.
- `exit_plan_mode` stays registered while plan mode is inactive but errors outside it ("only available in plan mode").
  It requires a markdown plan starting with a `#` heading, presents the plan through the user-questions channel as a
  `plan-review` card, and leaves plan mode only on approval. "Keep planning" returns the user's feedback and keeps the
  session in plan mode. Sandbox and approval policy are independent of plan mode and neither read nor write it.

### ask_user_question: blocking vs timed

- Default assembly: blocking — the tool pauses until a UI provider returns a human answer; the answer feeds back into the
  agent loop as an ordinary tool result.
- `mode: timed` assembly: adds `wait_seconds` (default 120, -1 requires an answer before proceeding). On timeout the
  call resolves with `selected: []`, `pending: true`, a pending-notice message, and the questions stay answerable; the
  user's later reply arrives as an `answer_to_pending_question` user message. Pending is not permission to proceed.

### PTC vs native presentation

- `run_code` is the PTC-mode presentation transport: a reserved name owned by `dsh-tools` that cannot be registered,
  shadowed, or restricted by plugins. In PTC mode the catalog exposes only `run_code` as a directly callable tool —
  "a tool call naming any other tool fails" — and every other tool is reached from inside the program through the SDK
  bindings (`tools.<name>`). In native mode all tool schemas go into the request directly.
- `tools.presentAs` switches a scope between native/PTC; `tools.restrict`/`tools.guard` narrow/guard global tools for
  a calling agent scope and are registration-plane abilities (skill/plugin author view), not model-facing tools.

### Skills and the /skill command

- The `skill` tool executes through `ctx.skills.list/get` with the caller's cwd/signal/scope. It returns
  `{ name, provider, resourceBase?, content }`, where `content` is the rendered `<skill_content>`.
- A user slash invocation (message contains the skill name and user-invocable) injects the same rendered content as a
  user message at `agent/pre-step`.
- The available-skill catalog section in the system prompt is refreshed per step from `ctx.skills.snapshot` filtered by
  model-invocability; when the catalog is empty the guidance instructs the model not to reuse names from earlier catalogs.

### Scheduling, MCP resources, and third-party bridges

- `schedule_*` come from `dsh-schedule`, assembled by the `@deepseek-ai/dsh-experimental-schedule-bundle`
  (experimental). Reminders are host-persisted; a due occurrence is delivered as a follow-up in its original session.
- `list_mcp_resources` / `list_mcp_resource_templates` / `read_mcp_resource` come from `dsh-mcp-resources` and
  register into the consumer's tool scope per MCP server (`resources/list`, `resources/templates/list`,
  `resources/read`).
- `read_page` and `x_search` are registered by the third-party `@liustack/modsearch` bridge as raw JSON-Schema tool
  definitions (no `output` schema) and are not part of the `@deepseek-ai/*` platform set; their presence depends on
  the modsearch bundle being installed.

### Tool output shape

- `defineTool` tools return a validated value against an `output.schema`; `output.render` maps `(args, value)` to the
  human-facing content, and `output.presentationMeta` projects card metadata. The Web GUI derives cards from the call
  record and the rendered content; `presentCall`/`presentResult` (when declared) are optional pure-render descriptors for
  host-local consumers and are never invoked by the scheduler.

## How Assembly Decides the Tool Set

Three layers, applied in order — later layers override earlier ones:

```text
1. bundle layers: each bundle's package.json "dsh.bundle" patch (e.g. @deepseek-ai/dsh-base/cordis.patch.yml,
   @deepseek-ai/dsh-web-app/cordis.patch.yml + presets/*.patch.yml, experimental bundles)
2. session preset: dsh-web-app presets (minimal / standard / ptc) mounted per session
3. profile patch: <dshHome>/profiles/<profile>/cordis.patch.yml
```

- `tool-bash` is disabled on Windows and `tool-pwsh` is disabled off Windows (via `!!js process.platform` guards).
- The web surface keeps the skill registry, goal service, session driver, subagent registry, and its backends on the
  host plane and lets each session mount a preset for the model-facing tools.
- Agent-team profile replaces the subagent-control rows by disabling them (see the delegated-tools family note).

## Constraints and Habits

- Sandbox defaults to `danger-full-access`, but still annotate file paths in skills as absolute or resolvable relative to `cwd`.
- Unix aliases like `ls -la` / `head` are unavailable in PowerShell; use `Get-ChildItem` / `Select-Object -First N`.
- `pwsh` paths use native Windows form (`C:\...`), read env with `$env:NAME`; managed `DSH_*` variables expose harness facts. A force-killed command settles as `[exit code: 1]` without a signal marker — treat it as an interruption, not a failure.
- Every `waterfall` event listener must call `next()`, or downstream short-circuits.

## Minimal Example

```text
User: Help me add a retry tool
Model: Using brainstorming to clarify requirements
       -> call skill(name="brainstorming")
       -> follow the skill's flow to ask questions, classify Spike/Bounded/Architectural
       -> after design approval, call skill(name="writing-plans") to slice
       -> dispatch subagent(prompt="implement task-03...") per slice and track with todo_write
```

## Re-verification Notes (edit this page, not the runtime)

- Every row above was read from the installed package sources listed in the catalog (layer 1) at DSH 0.2.0-rc.2.
- When a DSH upgrade changes a package, re-check that package's `lib/*.js` for the tool name, schema, and assembly
  condition before trusting this page; on conflict, update this page.
- The desktop anchor is a runtime measurement, not a guarantee: it is the tool set of a stock desktop session with the
  experimental bundles enabled, at the stated version.
