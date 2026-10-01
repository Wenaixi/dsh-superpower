# 架构深化实施计划（2026-10-02）

> **面向 Agent 执行者：** 必需子技能：executing-plans（内联执行，human partner 已选定）。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 把架构评审得出的 6 个深化候选落实为可验证的代码/内容变更：建立技能辅助资源契约检查（候选 1/2/3 的根因修复）、收敛 review-sync 三件套为共享引擎（候选 5）、补齐深度模块边界自检与治理脚本深度接口消费（候选 6）、修正 executing-plans 的裸路径调用违契（候选 4）。

**架构：** 只在治理层（scripts/）与技能内容层（skills/ 若干 SKILL.md 的正文行）做最小深化，不改 src/ 运行时逻辑（SkillCatalog/SkillDocument 已是深度模块，本轮不动其接口）。新增两个共享模块：scripts/lib/sync-common.mjs（同步复核引擎）与 scripts/lib/harness-common.mjs（自检骨架）。verify.mjs 新增两个检查区：资源契约检查、深度模块边界自检。上游字节同步契约（review-sync-deep 0 FAIL）与符号契约是硬门槛。

**技术栈：** Node.js ESM（.mjs），零新增依赖（yaml 已有），bash 可用（WSL）。构建/验证命令：pnpm build / pnpm typecheck / node scripts/verify.mjs / node scripts/review-sync-deep.mjs / node scripts/review-sync-tokens.mjs / node scripts/check-same-name-priority.mjs / node scripts/check-same-name-priority-fs.mjs。

**规格：** 架构评审 HTML 报告（2026-10-02 生成，6 候选 + 事实核对数据）与 CONTEXT.md 领域词汇。本计划是规格的实现论证；两处规格内事实已由独立核实纠正：spec-document-reviewer-prompt.md 在上游存在（不删除），孤儿文件不可移动/删除（上游同步契约），见任务 2 的裁决。

## 全局约束

- 上游同步硬门槛：`SP_UPSTREAM=E:/tmp/superpowers-v6.4.2/skills node scripts/review-sync-deep.mjs` 必须 0 FAIL（本地新增文件走 `本地新增` INFO 通道，白名单豁免沿用 dsh-tools.md / find-polluter.sh 先例）。
- 符号契约：全部新增/修改内容（含脚本注释）零 emoji / 零图形状态符号；ASCII 标记 `[OK]`/`[FAIL]`/`[WARN]`。
- 中文契约：正文自然语言简体中文，代码/命令/路径/正则/YAML 保持原文；不使用 AI 味套话。
- `pnpm build`、`pnpm typecheck` 零错误；`node scripts/verify.mjs` 15/15 PASS 且无新增 FAIL。
- 零新增依赖；全部新代码为 Node 内置（node:fs/node:path）与现有 import。
- 每个任务结束必须 commit（简体中文，动词开头）。
- 不在 main 之外创建 worktree：本计划在 main 分支内联执行（human partner 指示「不要问我、不要停下」+ 本仓库历史 49 个提交全部直接落 main + 本地个人项目无协作风险）。此裁决记入 ledger。

## Review Focus

1. **新契约检查误报**：技能正文的合法引用形态（跨技能 `../using-superpowers/references/codex-tools.md`、writing-skills 对 anthropic-best-practices.md 的裸文件名引用、visual-companion.md 对 scripts/* 的反引号引用）不得被新检查判死链——任务 2 用真实语料回归验证，并对示例文档（anthropic-best-practices.md 的 scripts/*.py 写作示例）设白名单。
2. **fences 清单漂移**：硬编码 13 技能清单已漏 2 个 v6.4.2 技能；改动态派生后必须能覆盖 15 个技能，未来新增技能自动覆盖——任务 1 用断言验证清单 == 15。
3. **上游同步契约回归**：executing-plans 的 bash 前缀修正（任务 4）不得造成 review-sync-deep FAIL（正文行改动不进代码块比对域）——任务 4 用 deep/tokens 全绿断言。
4. **提取重构不改变行为**：sync-common/harness-common 提取后，四个消费脚本输出必须与提取前基线一致——任务 1/5 用「先跑基线再重构跑同一命令比对」断言。
5. **边界自检的 RED 完整性**：任务 3 的自检断言必须覆盖 SkillDocument 每个边界（BOM/CRLF/kebab/缺字段/重复名/name drift/Abort），且每一条都要先验证「断言所钉行为确实存在」（对当前实现的回归锁定，非虚构）。

---

### 任务 1：同步复核引擎收敛（review-sync 三件套 → 共享 sync-common）

**文件：**
- 新建：`scripts/lib/sync-common.mjs`
- 修改：`scripts/review-sync-deep.mjs`、`scripts/review-sync-fences.mjs`、`scripts/review-sync-tokens.mjs`

**接口：**
- 消费：无（基线行为来自三脚本现实现）。
- 产出：`scripts/lib/sync-common.mjs` 具名导出 `norm(s)`、`fenceRe`、`splitBlocks(s)`、`walkMd(dir)`、`splitComment(line)`、`hasCJK(s)`；review-sync-fences 的 `allFiles` 清单改为从共享 `syncSkillsList(upstreamDir)` 动态派生。

- [ ] **步骤 1：跑提取前基线（三脚本再生性快照）**

运行：`bash -c "SP_UPSTREAM=/mnt/e/tmp/superpowers/skills node scripts/review-sync-deep.mjs; echo EXIT=$?; SP_UPSTREAM=/mnt/e/tmp/superpowers/skills node scripts/review-sync-tokens.mjs; echo EXIT=$?"`
预期：deep 输出 FAIL: 0，tokens 输出「全部通过」，两命令 exit 0。把输出尾部记入 `.superpowers/sdd/architecture-deepening/baseline-sync.txt`（供步骤 5 比对）。

- [ ] **步骤 2：在 `scripts/lib/sync-common.mjs` 中实现共享引擎**

具名导出，逻辑逐字复制自三脚本现有实现（行为不变）：
- `norm(s)`：CRLF/CR 归一为 LF（deep L13、fences L14、tokens L9 的同一实现）。
- `fenceRe`：`/\`\`\`(\w*)[^\n]*\n([\s\S]*?)\`\`\`/g`（deep L14、fences L15、tokens L10 的同一实现）。
- `splitBlocks(s)`：`[...s.matchAll(fenceRe)].map(m => ({ lang: m[1], body: m[2] }))`（deep L15、fences L27 的同一实现）。
- `walkMd(dir)`：递归收集 `.md` 文件相对路径（tokens L13-21 语义：仅 .md、相对路径、斜杠归一）。
- `splitComment(line)`：行内 \`#\` 注释切分（deep L18-21）。
- `hasCJK(s)`：\`/[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/\`（deep L22）。
- `syncSkillsList(upstreamDir)`：读上游目录下全部技能 SKILL.md 的相对路径（`walkMd` + 取一级目录名去重），返回排序数组；该函数供 fences 动态派生清单。
- 顶层注释写明：本模块是三件套的唯一同步契约实现，修改契约先改这里。

- [ ] **步骤 3：改造 `scripts/review-sync-tokens.mjs` 与 `scripts/review-sync-deep.mjs` 消费共享模块**

- tokens：删本地 `norm`/`fenceRe`/`walk` 实现，改 `import { norm, fenceRe, splitBlocks, walkMd } from './lib/sync-common.mjs'`；walk 使用点改为 `walkMd`。
- deep：删本地 `norm`/`fenceRe`/`blocks`/`splitComment`/`hasCJK`/walk 实现，改 import；行为保持逐字一致（含 INFO 豁免逻辑与标题豁免 Set）。

- [ ] **步骤 4：改造 `scripts/review-sync-fences.mjs`：动态清单 + 修串脚本注释**

- 删除 L18-24 硬编码 `allFiles` 数组，改 `const skills = syncSkillsList(process.env.SP_UPSTREAM || fallback)` 后还原为同名 13+2 逻辑：对每个技能路径（`<skill>/SKILL.md`）做并排比对。
- 修正 L4 注释：`node scripts/review-sync-deep.mjs` 改为 `node scripts/review-sync-fences.mjs`。

- [ ] **步骤 5：回归验证（提取后行为不变）**

运行：与步骤 1 完全相同的两条命令。
预期：deep FAIL: 0、tokens 全部通过、exit 0；输出与 `baseline-sync.txt` 的差异仅允许「无」或深复核 NOTE 明细完全一致。另运行 `node scripts/review-sync-fences.mjs` 确认清单覆盖 15 个技能（输出中出现 15 个 `==========` 分隔块，或 stderr 无「未找到」异常）。

- [ ] **步骤 6：提交**

```bash
git add scripts/lib/sync-common.mjs scripts/review-sync-deep.mjs scripts/review-sync-fences.mjs scripts/review-sync-tokens.mjs
git commit -m "refactor: 收敛 review-sync 三件套为共享 sync-common 引擎，fences 清单动态派生"
```

### 任务 2：verify.mjs 资源契约检查（引用协议统一 + 孤儿白名单）

**文件：**
- 修改：`scripts/verify.mjs`（现有死链检查 L57-96 区后新增「资源契约检查」区）

**接口：**
- 消费：无（独立纯函数，可自检）。
- 产出：`extractRefs(content)`（纯函数，输入 md 文本，输出相对引用集合）、`resolveResourceRefs(skillDir)`（返回 `{ missing: {file,ref}[], orphans: {file}[] }`）、`REFERENCE_EXEMPT`（白名单 Set：示例文档）。

- [ ] **步骤 1：编写失败的自检（TDD RED）**

在 verify.mjs 末尾新增「资源契约检查自检」小节，断言先写死：
```js
function assertRefExtraction() {
  const sample = `见 [a](../using-superpowers/references/codex-tools.md)。先读 \`references/context-safety.md\` 与 \`implementer-prompt.md\`，再 `bash scripts/review-package x`。`
  const refs = extractRefs(sample)
  // 三种形态都被提取：链接 target、反引号目录路径、反引号裸文件名
  if (!refs.includes('../using-superpowers/references/codex-tools.md')) throw new Error('link form not extracted')
  if (!refs.includes('references/context-safety.md')) throw new Error('tick-path form not extracted')
  if (!refs.includes('implementer-prompt.md')) throw new Error('tick-bare form not extracted')
  // 代码块内的示例引用不进入死链域（沿用 L59 剥离规则）
  const fenced = `\`\`bash
scripts/tool.sh
\`\`\``
  if (extractRefs(fenced).length !== 0) throw new Error('fenced example leaked into refs')
}
assertRefExtraction()
```
运行：`node scripts/verify.mjs`
预期：FAIL——`extractRefs` 未定义（ReferenceError），满足「失败测试先行」。

- [ ] **步骤 2：实现 `extractRefs(content)`**

纯函数（放在 verify.mjs 内、const 区）：
- 先剥离围栏代码块（复用 re 现有 L59 的 `/\`\`\`[\s\S]*?\`\`\`/g`），避免示例命令泄漏。
- 三种形态收集到 Set：
  a. `/\[[^\]]*\]\((<?)([^\)>\s]+)\1(?:s+["'][^"']*["'])?\)/g`（现有 L62 正则）取 group 2。
  b. `/\`((?:references|scripts|prompts|templates|examples)\/[\w./-]+)\`/g` 取 group 1（目录路径）。
  c. `/\`([\w.-]+\.(?:md|js|ts|cjs|sh|html))\`/g` 取 group 1（裸文件名）。
- 过滤：外链/`#`锚点/`mailto:`丢弃；空串丢弃。
- 返回 `[...refs]`。
- 具体行为由步骤 1 的断言钉死；其余边界（路径含空格、title 属性链接）由执行者按现有代码风格补。

- [ ] **步骤 3：实现 `resolveResourceRefs(skillDir)` 与白名单**

- 递归 `walk` skills 目录（用 node:fs/promises readdir，与现有 verify 递归一致）；对每个 .md 读内容 `extractRefs`，按所在目录 `resolve(dir, ref)`（剥锚点）stat；缺失收集 `{file, ref}`。
- 孤儿收集：skills 下所有非 SKILL.md 文件，若其 basename 未出现在任何提取 refs 里且非白名单 → 记 WARN 行（不置 `ok=false`）。
- `REFERENCE_EXEMPT`（白名单 Set，含理由注释）：
  - `skills/writing-skills/anthropic-best-practices.md`：正文中 scripts/*.py 为写作示例，非本仓文件承诺。
  - 其余在首跑暴露后再逐条判定：真死链修、示例入白名单。
- 孤儿白名单（上游遗留，同步契约禁止删除/移动）：
  - `skills/brainstorming/spec-document-reviewer-prompt.md`（上游存在，0 引用）
  - `skills/systematic-debugging/test-pressure-1.md`、`test-pressure-2.md`、`test-pressure-3.md`、`test-academic.md`、`CREATION-LOG.md`（上游存在，0 引用，模板路径已过期不做内容修改，防止破坏同步契约）

- [ ] **步骤 4：接入 verify 主流程**

在现有死链检查区之后打印三行汇总：
```
[verify] resource-contract check
[verify] missing refs: <N>（>0 则逐条 FAIL 并 ok=false）
[verify] unreferenced files: <N> WARN（仅列出，不置 FAIL）
```
对 `missing` 中每个条目输出 `[verify] MISSING REF <file>: <ref>` 并 `ok=false`；对 orphans 输出 `[verify] WARN unreferenced <file>`。

- [ ] **步骤 5：运行真实语料回归**

运行：`node scripts/verify.mjs`
预期：断言区 PASS（自检通过）；resource-contract 区打印 missing refs: 0、unreferenced: 恰为 6 个白名单行（WARN 不算 FAIL）；既有 checks 全部 PASS；exit 0。
若首跑出现「真死链」（如指向不存在文件的裸文件名引用），按 Review Focus 1 逐条裁决：真死链则修复引用（修改对应 md 正文），示例则入 REFERENCE_EXEMPT 并注释理由；裁决记入 ledger。

- [ ] **步骤 6：提交**

```bash
git add scripts/verify.mjs
git commit -m "feat: verify 新增资源契约检查，统一三种引用形态并声明孤儿白名单"
```

### 任务 3：verify.mjs 深度模块边界自检（SkillDocument/SkillCatalog 契约锁定）

**文件：**
- 修改：`scripts/verify.mjs`（任务 2 后新增「深度模块边界自检」区）

**接口：**
- 消费：`../lib/superpowers.js` 已导出的 `SkillDocument`、`SkillCatalog`。
- 产出：无新导出；自检断言函数 `assertDocumentBoundaries()` / `assertCatalogBoundaries()`。

- [ ] **步骤 1：先对当前实现逐条断言行为属实（回归锁定的前提）**

在落到 verify 之前，本步骤在临时脚本 `.superpowers/sdd/architecture-deepening/boundary-probe.mjs` 写全 8 条断言并运行，逐条确认当前行为（每条都是对既存正确行为的捕捉）：
1. BOM：`SkillDocument.fromString('\uFEFF---\nname: bom-x\ndescription: d\n---\n')` 的 `.name === 'bom-x'`。
2. CRLF：`'---\r\nname: crlf-x\r\ndescription: d\r\n---\r\n'` 解析 `.name === 'crlf-x'`。
3. kebab：`'---\nname: Bad_Name\ndescription: d\n---\n'` 抛 TypeError 且 message 含 `kebab`。
4. 缺 name：`'---\ndescription: d\n---\n'` 抛 Error 且 message 含 `name`。
5. 缺 description：`'---\nname: x\n---\n'` 抛 Error 且 message 含 `description`。
6. 重复名：mkdtemp 建两子目录各写同名 SKILL.md，`SkillCatalog.fromDirectory` 后 `verifyIntegrity().duplicates.length === 1`。
7. name drift：目录 `dir-a` 内 SKILL.md frontmatter name 为 `dir-b`，`verifyIntegrity().entries[0].nameDrift === true`。
8. AbortSignal：`AbortSignal.abort()` 传入 `SkillDocument.fromFile`（指向真实文件），断言抛 `DOMException` 名 `AbortError`。
运行：`node .superpowers/sdd/architecture-deepening/boundary-probe.mjs`
预期：8 条全过（或个别与断言预期不同则按根因修正断言——断言钉死的是真实现行为，不是理想化假设）。通过后把断言原样搬入 verify.mjs 自检区。

- [ ] **步骤 2：把边界自检接入 verify.mjs**（在任务 2 自检区后）

新增 `assertDocumentBoundaries()`（第 1-5、8 条，纯内存）+ `assertCatalogBoundaries()`（第 6-7 条，mkdtemp 后整棵删除，零残留）；两函数任一抛错则 `ok=false` 并打印 `[verify] BOUNDARY FAIL: <msg>`。调用点放在资源契约自检之后、核心文件存在性检查之前。删去 boundary-probe.mjs 临时文件。

- [ ] **步骤 3：全量回归**

运行：`pnpm build && pnpm typecheck && node scripts/verify.mjs`
预期：build/typecheck 零错误；verify 15/15 PASS + 边界自检 PASS + 资源契约 PASS；exit 0。

- [ ] **步骤 4：提交**

```bash
git add scripts/verify.mjs
git commit -m "test: verify 增加 SkillDocument/SkillCatalog 边界自检（BOM/CRLF/kebab/缺字段/重复/漂移/中止）"
```

### 任务 4：executing-plans 裸路径调用加 bash 前缀（writing-skills 契约一致化）

**文件：**
- 修改：`skills/executing-plans/SKILL.md`（约 L82、L99、L129、L137）

**接口：**
- 消费：无。
- 产出：正文四处裸反引号调用改为带 `bash ` 前缀，与 writing-skills/SKILL.md:374「通过解释器调用随包脚本」契约一致；不改任何代码块内容。

- [ ] **步骤 1：写 RED 断言（契约检查先失败）**

在 verify.mjs 资源契约检查区追加一条契约断言：对 executing-plans/SKILL.md 提取的引用中，匹配 `scripts/[w./-]+` 或 `../[w./-]+/scripts/[w./-]+` 的条目必须满足「上一非空白 token 为 bash|node|sh|python|npx」或该行以反引号为纯路径指示（非执行）。当前实现下该断言失败（裸调用），构成 RED。
运行：`node scripts/verify.mjs` → 预期该断言 FAIL（先看到红）。

- [ ] **步骤 2：修正 `skills/executing-plans/SKILL.md` 四处调用**

- L82：```../subagent-driven-development/scripts/sdd-workspace PLAN_FILE``` → ```bash ../subagent-driven-development/scripts/sdd-workspace PLAN_FILE```
- L99：```scripts/task-start PLAN_FILE N``` → ```bash scripts/task-start PLAN_FILE N```
- L129：```scripts/task-done PLAN_FILE N BASE -- <测试命令>``` → ```bash scripts/task-done PLAN_FILE N BASE -- <测试命令>```
- L137：```../subagent-driven-development/scripts/review-package PLAN_FILE MERGE_BASE HEAD``` → ```bash ../subagent-driven-development/scripts/review-package PLAN_FILE MERGE_BASE HEAD```
仅这些行；不重排段落、不改其他文本。

- [ ] **步骤 3：GREEN 验证（契约断言通过 + 上游同步契约不破）**

运行：`node scripts/verify.mjs` → 契约断言 PASS、全绿。
运行：`bash -c "SP_UPSTREAM=/mnt/e/tmp/superpowers/skills node scripts/review-sync-deep.mjs; echo EXIT=$?"` 与 `bash -c "SP_UPSTREAM=/mnt/e/tmp/superpowers/skills node scripts/review-sync-tokens.mjs; echo EXIT=$?"`
预期：deep FAIL: 0（正文行改动不进代码块比对域，允许 NOTE）、tokens 通过。若 deep 报 FAIL，按 systematic-debugging 定位（大概率是「代码块行数」或「标题数」误判，按契约裁决）。

- [ ] **步骤 4：提交**

```bash
git add skills/executing-plans/SKILL.md scripts/verify.mjs
git commit -m "fix: executing-plans 脚本调用统一 bash 前缀，使 writing-skills 调用契约全仓一致"
```

### 任务 5：治理脚本深度接口消费（priority 骨架收敛 + frontmatter 统一）

**文件：**
- 新建：`scripts/lib/harness-common.mjs`
- 修改：`scripts/check-same-name-priority.mjs`、`scripts/check-same-name-priority-fs.mjs`、`scripts/review-sync-deep.mjs`

**接口：**
- 消费：`@deepseek-ai/cordis` 的 `Context`、`@deepseek-ai/dsh-skill` 的 `SkillRegistry`、`../lib/superpowers.js` 的 `SkillDocument`。
- 产出：`harness-common.mjs` 具名导出 `check`（同现两脚本 L26-30/L52-56 语义，返回 failed 计数）、`freshRegistry`（L67-71/L58-62）、`exitByFailed(failed)`（`process.exit(failed === 0 ? 0 : 1)`）、`stripFencesAndGetFrontmatter`（供 review-sync-deep 复用 SkillDocument 深度接口）。

- [ ] **步骤 1：建 `scripts/lib/harness-common.mjs`**

逐字收敛两 priority 脚本的 `check`/`freshRegistry`/`process.exit` 三处骨架；顶层注释说明用途与两消费方。

- [ ] **步骤 2：两 priority 脚本改消费共享骨架**

删本地 `check`/`freshRegistry`/`exit` 实现，改 import；功能零变化。
运行：`node scripts/check-same-name-priority.mjs` 与 `node scripts/check-same-name-priority-fs.mjs`
预期：两脚本输出「全部通过」exit 0（与提取前一致）。

- [ ] **步骤 3：review-sync-deep 的 frontmatter 解析统一到 SkillDocument**

- deep L66-71 的 `/^---\n([\s\S]*?)\n---\n/` 正则提取改为：对两个文件分别 `SkillDocument.fromString(u, upPath)` / `fromString(l, loPath)`，取 `.name` 与 `.description` 比较（校验语义与运行时完全一致）。
- 保留「上游无 frontmatter/解析失败 → FAIL」分支（捕获 fromString 抛错）。
- 注意：deep 现检查「description 缺失/未中文化」——SkillDocument 对缺 name/description 直接抛错，正好覆盖；「未中文化」检查仍用 `hasCJK(desc)`。
运行：`bash -c "SP_UPSTREAM=/mnt/e/tmp/superpowers/skills node scripts/review-sync-deep.mjs; echo EXIT=$?"`
预期：FAIL: 0（15/15 通过路径不变；若某技能因 fromString 严格校验而被拒——如上游 frontmatter 有非 kebab 名字——按 systematic-debugging 核实后裁决，大概率无此情况）。

- [ ] **步骤 4：提交**

```bash
git add scripts/lib/harness-common.mjs scripts/check-same-name-priority.mjs scripts/check-same-name-priority-fs.mjs scripts/review-sync-deep.mjs
git commit -m "refactor: priority 双脚本共享 harness-common 骨架，frontmatter 解析统一走 SkillDocument"
```

### 任务 6：全量验证矩阵 + 最终评审 + 收尾

**文件：** 无新增（验证性任务）。

**接口：** 消费前五任务全部产物。

- [ ] **步骤 1：全量验证矩阵**

运行（逐条记录输出）：
1. `pnpm build`
2. `pnpm typecheck`
3. `node scripts/verify.mjs`（含资源契约 + 边界自检）
4. `node scripts/check-same-name-priority.mjs`
5. `node scripts/check-same-name-priority-fs.mjs`
6. `bash -c "SP_UPSTREAM=/mnt/e/tmp/superpowers/skills node scripts/review-sync-deep.mjs; echo EXIT=$?"`
7. `bash -c "SP_UPSTREAM=/mnt/e/tmp/superpowers/skills node scripts/review-sync-tokens.mjs; echo EXIT=$?"`
8. `node scripts/review-sync-fences.mjs`（清单覆盖 15 技能无异常）
预期：全部成功（build/typecheck 零错误；verify 全绿；priority 全 PASS；deep FAIL: 0；tokens 通过；fences 无异常）。任一失败 → systematic-debugging 定位修复后再跑全矩阵。

- [ ] **步骤 2：全分支评审**

派一个全新 reviewer subagent（code-reviewer.md 模板）：BASE = 任务 1 前 HEAD，HEAD = 当前 HEAD。
`{DESCRIPTION}`：架构深化五任务（sync 引擎收敛/资源契约/边界自检/前缀修正/骨架共享）
`{PLAN_OR_REQUIREMENTS}`：本计划前六节。
反馈分级：Critical/Important 在本计划内修（RED→GREEN + 全绿）；Minor 记 ledger。

- [ ] **步骤 3：修复轮（如评审有 Critical/Important）**

按评审意见逐条 TDD 修复并验证（验证命令全矩阵重跑）；无则跳过。

- [ ] **步骤 4：清理与收尾**

- 删除临时 `.superpowers/sdd/architecture-deepening/boundary-probe.mjs`（若步骤 3 任务 3 未删）。
- 用 finishing-a-development-branch 的验证（全矩阵已绿）后汇报：工作已在 main 完成（human partner 指示不询问集成方式），列出 commits；更新 CONTEXT.md 领域词汇（新增 sync-common / harness-common / 资源契约检查 三个术语条目）并 commit；更新 CLAUDE.md 决策日志（本计划裁决与 6 候选处置结果）。
