# CLAUDE.md — dsh-superpower 项目记忆库

> **角色**：本文件是 `dsh-superpower` 的核心记忆库与开发宪法。
> **使用**：每次对话开始前读取以同步上下文，工作完成后更新以记录关键决策。保持专业、简洁、准确，及时删除过时内容。
> **维护**：采用规范驱动开发，所有变更以本文为准绳。

- **最后更新**：2026-08-22
- **上游同步**：`obra/superpowers v6.3.0`（基线）；本包 `package.json#version` 为 `6.3.0-dsh.2`

---

## 1. 项目定位

| 维度 | 说明 |
|---|---|
| **名称** | `dsh-superpower` |
| **本质** | [obra/superpowers](https://github.com/obra/superpowers) 的 DSH 完整移植版 |
| **形态** | DSH 组合包（bundle），通过 `dsh.bundle.patch: ./cordis.patch.yml` 对外发布 |
| **上游版本** | `v6.3.0`，与 `package.json#version` 严格同步 |
| **协议** | MIT，与上游一致 |
| **语言约定** | 技能正文与对外文档为简体中文；代码、命令、路径、变量名保持原文；不使用 emoji |
| **远程** | `github:Wenaixi/dsh-superpower`，主分支 `main`，当前标签 `v6.3.0` |

**一句话定位**：把上游 14 个方法论技能以 DSH 原生 `SkillProvider` 注入 `ctx.skills`，`rank 550` 可被项目级覆盖，安装即生效，无需额外配置。

---

## 2. 技术栈

- **运行时**：Node.js `>=20`，TypeScript `^5.6`，`module: NodeNext` / `moduleResolution: NodeNext`
- **依赖**：
  - 运行时：`yaml ^2.4.2`（frontmatter 解析）
  - 对等依赖：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-skill ^0.1.1-rc.2`、`@deepseek-ai/schemastery ^3.18.1`
- **构建**：`tsc -p tsconfig.build.json -> lib/`，产物 `lib/` 不提交，`skills/` 为事实来源
- **包管理**：`pnpm >=9`（DSH profile 管理依赖它）
- **宿主**：`dsh` CLI（`npm i -g @deepseek-ai/dsh`）

---

## 3. 架构与关键决策

### 3.1 插件形态

- **函数形态**（最简可用即采用，暂不升级为 `Service` 类）：
  ```ts
  export const name = 'superpowers'
  export const inject = ['skills'] as const
  export const Config = Schema.object({ providerName: Schema.string().default('superpowers'), skillDir: Schema.string() })
  export function apply(ctx: Context, config: Config) { /* ... */ }
  ```
- 通过 `ctx.skills.registerProvider()` 注册 `SuperpowersProvider`，走 `ctx.effect`/`ctx.on` 注册，卸载时自动清理，HMR 无残留。
- **失败要响亮**：`apply` 抛异常则进程终止；单个 `SKILL.md` 非法仅跳过该技能并 `warn`，不阻断整体；`Config` 校验失败在加载时明确报错。

### 3.2 SkillProvider 设计

| 属性 | 取值 | 说明 |
|---|---|---|
| **类** | `SuperpowersProvider implements SkillProvider` | 详见 `src/superpowers.ts` |
| **rank** | `550` | 介于 `user-agents (500)` 与 `bundled (600)` 之间；`~/.dsh/skills` 与项目 `.dsh/skills` 可按名覆盖本包，本包可覆盖内置 `bundled` |
| **source** | `bundled` | 固定值，符合 DSH 缝隙表对“随包分发技能”的约定 |
| **provider** | `superpowers` | 可通过 `providerName` 配置覆盖；`RUNTIME_PROVIDER` 保留名不可用 |
| **resourceBase** | `{ kind: 'directory', path: dirname(locator.path) }` | 保证技能内 `references/*`、`scripts/*` 相对路径可解析 |
| **skillDir** | 默认 `resolve(dirname(fileURLToPath(import.meta.url)), '..', 'skills')` | 可通过 `config.skillDir` 覆盖，指向本地上游检出 `E:/tmp/superpowers/skills` 用于联调 |

**`list()` / `get()` 语义**：

- `list()`：扫描 `skillDir` 下一级目录，过滤隐藏目录与非目录，校验 `SKILL.md` 存在，解析 frontmatter（`name`/`description`/`whenToUse`/`invocation`），按 `isSkillName` 校验 kebab-case，返回 `SkillCandidate[]`。缺失 `skillDir` 时 `warn` 并返回空数组。
- `get()`：按 `candidate.locator.path` 重读文件，二次校验 `name` 与 `candidate.name` 一致性，不一致返回 `undefined` 触发上层 `invalidateCache`；校验 `invocation` 合法性。

### 3.3 分发与加载顺序

生效配置在空根之上按序叠加，后应用层按行胜出，`config` 为整值替换而非深度合并：

1. `@deepseek-ai/dsh-base` 各层
2. `dsh-superpower` 层（`# == dsh-superpower` — `insert: [{ id: superpowers, name: dsh-superpower }]`）
3. profile 的 `cordis.patch.yml`（`$DSH_HOME/profiles/<name>/cordis.patch.yml`）
4. `$DSH_HOME/cordis.patch.yml`（机器级共享偏好）
5. `--patch <path>` 叠加层（按 argv 顺序）

推论：用户可在 profile 层覆盖本包任意行；本包不应假设独占。

### 3.4 为什么选自注册 Provider

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| 向 `~/.dsh/skills` 拷贝文件 | 简单直观 | 污染用户目录、无法随 profile 卸载、作用域不可控 | 弃用 |
| 依赖宿主预设 `bundledSkillDir` | 无需代码 | 依赖 `dsh-app-boot` 注入与环境变量 `DSH_BUNDLED_SKILL_DIR` | 不稳定 |
| **自注册 `SkillProvider`** | 作用域正确（host/preset 隔离）、`ctx.effect` 自动清理、`rank` 可控、卸载即消失 | 需实现 `list`/`get` | **采用** |

---

## 4. 技能清单（14 个，主技能 + 20 辅助文档）

| 技能 | frontmatter `description` 中文（已中文化） | 正文与辅助 |
|---|---|---|
| `using-superpowers` | 适用于任何对话开始前，建立技能查找与调用规范 | 已中文化；Platform Adaptation 置顶 DSH 条目 `references/dsh-tools.md` |
| `brainstorming` | 创意工作前必用：创建功能/组件/能力/行为变更前先澄清 | 已中文化；含 `spec-document-reviewer-prompt.md`、`visual-companion.md`、`scripts/*` |
| `writing-plans` | 已有清晰需求且未编码时，把需求拆解为可执行实施计划 | 已中文化；含 `plan-document-reviewer-prompt.md` |
| `using-git-worktrees` | 需与当前工作区隔离的功能开发或执行计划前 | 已中文化 |
| `executing-plans` | 已有详细实现计划，在隔离会话中逐项执行 | 已中文化 |
| `subagent-driven-development` | 当前会话内执行含独立任务的计划，基于子代理分发 | 已中文化；含 `implementer-prompt.md`、`task-reviewer-prompt.md`、`re-review-prompt.md`、`scripts/{review-package,sdd-workspace,task-brief}` |
| `dispatching-parallel-agents` | 2+ 无共享状态的独立任务并行委派 | 已中文化 |
| `test-driven-development` | 实现新功能或修复缺陷前先写测试的完整指南 | 已中文化；含 `writing-good-tests.md` |
| `systematic-debugging` | 遇到缺陷/测试失败/异常行为时先根因分析 | 已中文化；含 `root-cause-tracing.md`、`defense-in-depth.md`、`condition-based-waiting.md` 及示例/脚本 |
| `verification-before-completion` | 声称完成/修复/通过前必须运行验证命令 | 已中文化 |
| `requesting-code-review` | 任务完成/重大功能/合并前校验 | 已中文化；含 `code-reviewer.md` |
| `receiving-code-review` | 收到评审意见后实施前需验证 | 已中文化 |
| `finishing-a-development-branch` | 实现完成且测试通过后决定分支集成方式 | 已中文化 |
| `writing-skills` | 创建/编辑/验证技能时使用 | 已中文化；含 `testing-skills-with-subagents.md`、`persuasion-principles.md`、`anthropic-best-practices.md`、`render-graphs.js` 等 |

**DSH 专属新增**：`skills/using-superpowers/references/dsh-tools.md` — 上游 Claude Code / Codex 工具到 DSH 的完整映射表，是所有技能在 DSH 下可执行的前提。

**中文化约定**：`frontmatter.name` 保持英文 kebab-case；`description` 译为 40–80 字简体中文并加引号；正文自然语言译为中文，代码块、命令、路径、变量名、正则、YAML/JSON、dot 流程图语法保持原文。

---

## 5. 工具映射（上游 -> DSH）

| 上游提及 | DSH 等价 | 备注 |
|---|---|---|
| `Bash` | `pwsh`（首选，Windows 友好）或 `bash` | 长耗时命令用 `run_in_background: true`，通过 `job_output`/`job_list` 收敛 |
| `Read` / `Write` / `Edit` | `fs` 工具的 `read` / `write` / `edit` | `write`/`edit` 自动触发 `fs/observed` 失效 |
| `Glob` / `Grep` | `fs-search` 工具的 `glob` / `grep` | 大仓用 `include` 过滤 |
| `Task` / `Subagent` | `subagent` / `subagent_fork` / `workflow` | 单任务 `subagent`，多阶段扇出 `workflow`（`agent`/`pipeline`/`parallel`） |
| `AskUserQuestion` | `ask-user` | 阻塞式提问，遵守 `userQuestions` 策略 |
| `TodoWrite` | `todo` | 每次提供全量列表，至少一项 `in_progress` |
| `Skill` | `skill` | `skill(name)` 加载 `<skill_content>`，与 `ctx.skills.get()` 同源 |
| `WebSearch` / `WebFetch` | `web` | 已统一为 `web` 工具（`web_search` + `web_fetch_exa`） |
| `git worktree` | `bash`/`pwsh` 中直接执行 `git worktree` | DSH 无 worktree 专属封装 |

**约束**：PowerShell 中 `ls -la`/`head` 等 Unix 别名不可用，用 `Get-ChildItem`/`Select-Object -First N`；所有 `waterfall` 监听必须调用 `next()`，否则有意短路下游。

---

## 6. 目录结构

```
dsh-superpower/
├── src/superpowers.ts          # 插件入口 + SuperpowersProvider (rank 550)
├── skills/                     # 14 技能（含 references/scripts/*.md），事实来源
│   └── using-superpowers/references/dsh-tools.md  # DSH 专属映射（勿删）
├── scripts/verify.mjs          # 冒烟：校验 14 技能可列举 + 关键文件存在
├── cordis.patch.yml            # bundle 层：insert: [{ id: superpowers, name: dsh-superpower }]
├── package.json                # dsh.bundle.patch + version + repository/homepage/bugs
├── tsconfig.json / tsconfig.build.json  # module: NodeNext, outDir: lib
├── lib/                        # 构建产物（gitignore，不提交）
├── README.md                   # 中文对外文档（安装/使用/开发/分工）
├── CONTRIBUTING.md             # 贡献与上游同步流程
├── CHANGELOG.md                # 上游 Release Notes + DSH 移植变更
├── LICENSE                     # MIT
└── CLAUDE.md                   # 本文件
```

---

## 7. 开发与验证

### 7.1 本地开发回路

```bash
pnpm install
pnpm build        # tsc -p tsconfig.build.json -> lib/
pnpm typecheck    # tsc --noEmit
node scripts/verify.mjs
dsh --profile superpower-test --dump-config  # 断言出现 "# == dsh-superpower" 与 "id: superpowers"
```

**不走 profile 的本地调试**（源码 checkout 叠加层）：

```bash
pnpm dsh web --patch ./cordis.patch.yml
```

**覆盖技能目录**（指向本地上游检出，便于对照）：

```yaml
# 临时 cordis.patch.yml
- insert:
    - id: superpowers
      name: dsh-superpower
      config:
        skillDir: E:/tmp/superpowers/skills
```

### 7.2 验证清单（完成前必检）

- [ ] `pnpm build` 与 `pnpm typecheck` 零错误
- [ ] `node scripts/verify.mjs` 输出 `14/14 PASS` 且关键文件齐全
- [ ] `dsh --profile <name> --dump-config` 包含 `# == dsh-superpower` 层
- [ ] 模型侧 `ctx.skills.list({ cwd })` 返回 14 条 `provider: superpowers`，`get("brainstorming")` 可加载且含中文正文
- [ ] 所有新增/修改的 `SKILL.md` 的 frontmatter 为合法 YAML，`name` 为 kebab-case 且与目录名一致（允许 frontmatter 与目录名不一致时以 frontmatter 为准并 `warn`）
- [ ] 文档与注释为简体中文，无 emoji，无 AI 味

---

## 8. 配置

`src/superpowers.ts` 的 `Config`（Schemastery，默认值写在 schema 里）：

```ts
export const Config = Schema.object({
  providerName: Schema.string().default('superpowers'),  // 注册到 ctx.skills 的 provider 名
  skillDir: Schema.string(),                              // 绝对路径，默认取包内 skills/
})
```

- 无效配置在插件加载时响亮失败，不静默回退。
- 凡不同部署可能改值的参数都必须进 `Config`，不使用普通对象充当配置。

---

## 9. 编码规范（四原则 + DSH 硬规则）

### 9.1 四原则

| 原则 | 含义 |
|---|---|
| **编码前思考** | 明确假设、呈现多种解释、困惑时停下问清，不默默选一条 |
| **简洁优先** | 用最少代码解决问题，不添加未要求的功能/抽象/可配置性 |
| **精准修改** | 只碰必须碰的，不顺手重构无关代码，不改动不应碰的格式 |
| **目标驱动执行** | 先定义可验证的成功标准，循环验证直到达成 |

### 9.2 DSH 硬规则

1. **接口以生成参考为准**，不凭服务名或旧代码猜 API。
2. **所有贡献都是副作用**，经 `ctx` 注册，随插件卸载自动撤销；不返回 disposer 的第三方订阅要主动查清清理机制。
3. **`waterfall` 监听必须调用 `next()`**，不调用即有意短路。
4. **失败要响亮**，不吞错。
5. **必需依赖用 `inject` 声明**，可选依赖用 `ctx.get()` 判空，不直接访问未声明的 `ctx.xxx`。
6. **配置一律 Schemastery**，默认值进 schema。
7. **工具 `execute` 返回规范 JSON**，人类文本放 `output.render`。
8. **模型可见即已记录**，新增模型可见输入需落在会话日志可重建机制内。

---

## 10. Git 与发布

- **远程**：`github:Wenaixi/dsh-superpower`，主分支 `main`，当前标签 `v6.3.0-dsh.2`（基线 `6.3.0` 同步上游）
- **版本原则（强制）**：`package.json#version` 的基线 `6.3.0` 与上游 `obra/superpowers` **严格同步**；上游未发新版时**不得**自行 bump `x.y.z`/`x.y.z+1` 正式补丁；仅涉及本仓库文档/构建/发布链路的非功能修正，以四段位 `6.3.0.N` 演进（如 `6.3.0-dsh.2`，`N` 单调递增），基线不变，绝不产生与上游不一致的正式版本号
- **`.gitignore`**：`lib/`、`node_modules/`、`*.tgz`、`.dsh/`、`.superpowers/`、`.worktrees/`、`.private-journal/`、`coverage/`、`tmp/`、`temp/`、`.cache/` 等（已对齐上游并扩展 DSH 本地状态）
- **发布流程**：
  ```bash
  pnpm build
  pnpm pack                  # 产出 dsh-superpower-6.3.0.tgz
  dsh plugin --profile demo add ./dsh-superpower-6.3.0.tgz  # 验证可安装
  git tag -a v6.3.0 -m "v6.3.0 — 同步上游 obra/superpowers v6.3.0"
  git push --follow-tags
  gh release create v6.3.0 --generate-notes  # 可选
  ```

---

## 11. 常见任务

| 任务 | 操作 |
|---|---|
| **新增技能** | 在 `skills/<kebab-name>/` 下创建 `SKILL.md`（frontmatter 必含 `name`/`description`），`pnpm build && node scripts/verify.mjs` 验证数量 `14 -> 15`，更新 `README.md` 与本文件技能表 |
| **同步上游** | `git clone --depth 1 https://github.com/obra/superpowers.git /tmp/superpowers`，对比 `skills/` 与 `package.json#version`，保留 `dsh-tools.md`，全量中文化后 `verify`，同步 `CHANGELOG.md` |
| **改 rank** | 修改 `src/superpowers.ts` 的 `SUPERPOWERS_RANK` 常量，同步更新 `README.md`、`CHANGELOG.md` 与本文件 |
| **排查加载失败** | `dsh --profile <name> --dump-config` 看层是否出现 → `ctx.skills.list({cwd})` 看是否 14 条 → 检查 `SKILL.md` 是否缺 frontmatter（会被 `warn` 跳过）→ 检查 `skillDir` 是否指向存在目录 |
| **中文化新技能** | `frontmatter.name` 保持英文，`description` 译 40–80 字中文并加引号；正文自然语言译中文，代码/命令/路径不译；执行 `node scripts/verify.mjs` 校验 CJK 字符数 |

---

## 12. 注意事项

- **Windows 环境**：`dsh` 默认 `pwsh`，`bash-sandbox` 被禁用；`skills` 中 `*.sh` 脚本保留，必要时补充 `*.ps1`，PowerShell 中用 `Get-ChildItem`/`Select-Object -First N` 替代 `ls -la`/`head`
- **相对资源**：技能内相对资源（`references/*`、`scripts/*`）通过 `resourceBase` 解析，不要写绝对路径
- **工具映射**：上游技能正文中的 Claude Code 专属工具名已在 `dsh-tools.md` 统一映射，新增技能需同步该表
- **构建产物**：`lib/` 为 `tsc` 产物，不提交；`skills/` 为事实来源，修改后需重新 `pnpm build` 以更新 `lib/superpowers.js` 的路径解析
- **分支策略**：`main` 为发布分支，功能开发从 `main` 切 `feat/*`/`fix/*`/`chore/sync-upstream-v*`，经 `verify` 后 PR 回 `main`
- **提交信息**：简体中文，动词开头，小步提交（一个技能或一个文档一 commit），示例：`feat: 新增 xxx 技能`、`fix: 修正 skillDir 解析在 ESM 下的边界`、`chore: 同步上游 v6.3.1`

---

## 13. 决策日志

| 日期 | 决策 | 说明 |
|---|---|---|
| 2026-08-22 | 选用自注册 `SkillProvider` | 而非向 `~/.dsh/skills` 拷贝文件，符合 DSH profile 隔离与可卸载语义 |
| 2026-08-22 | `rank 550` 折衷 | 使项目级（`~/.dsh/skills` 500）可覆盖本包，本包可覆盖 `bundled` (600)；如需强于项目级可改 90 但违背约定 |
| 2026-08-22 | 全量中文化 | 14 个 `SKILL.md` + 20 辅助文档，`frontmatter.name` 保持英文，`description` 译 40–80 字中文 |
| 2026-08-22 | 新增 `dsh-tools.md` | 在 `using-superpowers` 的 Platform Adaptation 中置顶 DSH 条目，要求优先阅读 |
| 2026-08-22 | 仓库初始化 | `v6.3.0` 同步上游，推送至 `Wenaixi/dsh-superpower`，标签 `v6.3.0`；`README.md`/`CONTRIBUTING.md`/`CHANGELOG.md` 齐全 |
| 2026-08-22 | 完善 `CLAUDE.md` | 重构为 13 章完整记忆库，新增“技术栈/架构决策/验证清单/编码规范/Git 发布/常见任务”体系化章节 |

---

## 14. 给 AI 协作者的提示

- **先读本文与 `README.md`**，再做任何代码或文档改动。
- 涉及技能正文时，必读 `skills/using-superpowers/references/dsh-tools.md`，按 DSH 工具名行事。
- 遇到阻碍或需决策时，优先用 `web_search` 查最新信息，用 `context7` 查文档（若可用）。
- 完成一个小模块/组件/细节后立即 `commit`，保持提交粒度细。
- 除非用户明确准许，不主动 `push` 到远程；本地验证通过后再请示推送。
- 工作结束前自行维护本文件：补充新决策、删除过时内容、保持与 `package.json#version` 一致。

