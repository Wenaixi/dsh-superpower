# DSH-Superpower 架构深化修复实施计划

> **面向 Agent 执行者：** 必需子技能：使用 executing-plans 按任务逐项实现本计划。步骤使用复选框（`- [ ]`）语法跟踪进度。本计划对应 2026-10-04 架构评审（`architecture-review-20261004-022133.html`）确认的候选。

**目标：** 修复 SkillCatalog 快照判据对 SKILL.md 内容编辑与增量新建的失明窗口（候选 1），并为候选 2 核实出的三处低风险靶点（verifyIntegrity ok 语义分裂 / 15 魔法数收敛 / required 恒真项清理）落地最小修复。

**架构：** 宿主侧四深度模块（SkillCatalog / SkillDocument / SkillSwitches / SuperpowersProvider）的接口一律不动，只加深 SkillCatalog 私有失效判定（三键聚合指纹）与收敛门禁侧魔法数；验证面维持「接口即测试表面」，新规则均以 selfTest 可失败断言落地并经破坏实测证明。

**技术栈：** Node >=20、TypeScript ^5.6（NodeNext）、现有 yarn 依赖（仅 `yaml`）、免新增任何依赖。

**规格：** 2026-10-04 架构评审候选报告（含候选 1 复现探针证据、候选 2 归属表/靶点清单、候选 4 三档评估、附录观察项）。执行者请先读 `docs/superpowers/plans/2026-10-02-architecture-deepening.md` 了解既往深度化决策，再读本计划与 `CONTEXT.md`。

## 全局约束

- 全文符号契约：无 emoji 与图形符号，状态用 ASCII [OK]/[FAIL]/[WARN]；注释与文档简体中文。
- 技能接口零破坏：`SkillCatalog` / `SkillDocument` / `SkillSwitches` 的公开方法与签名保持不变，只允许加深私有实现。
- 构建链：`src/client.js` 由 `scripts/build-client.mjs` 复制，不经 tsc；仅改 `src/*.ts` 时跑 `pnpm build` + `pnpm typecheck`。
- 门禁全部 Exit 0：`pnpm build && pnpm typecheck`、`node scripts/verify.mjs`、`node scripts/check-skill-switches.mjs`、`node scripts/check-same-name-priority.mjs`。
- 每条新断言必须做过破坏实测：人为破坏后确认变红，再还原。
- 每完成一个任务立即 git commit（中文提交信息）。

## Review Focus

- **SKILL.md 正文被编辑而目录名未变**：期望下一轮 list 返回新内容（现实现返回旧快照，候选 1 缺陷本体）。
- **先 mkdir 技能目录、稍后才写入 SKILL.md**：期望写入后下一轮 list 可见该技能（现实现目录 mtime 判据抓不到，核实新增窗口）。
- **技能目录整体被删除**：期望下一轮 list 不再包含（现有判据可覆盖，防回归）。
- **verifyIntegrity().ok 被未来调用方当作权威**：期望它反映 missingSkillMd（现实现漏判，靶点 A 语义分裂）。
- **技能数量从 15 变为其他值**：期望所有断言点位统一红（现实现 4 处魔法数，靶点 B）。

---

### 任务 1：SkillCatalog 三键聚合指纹（候选 1 主修复）

**文件：**
- 修改：`src/catalog.ts`（`isDirModified` / `scan` / 新增私有指纹字段）
- 测试：`src/catalog.ts` 内 `SkillCatalog.selfTest()` 新增用例

**接口：**
- 消费：无（纯内部加深）
- 产出：`SkillCatalog.selfTest()` 新增 4 条用例（正文编辑重扫 / getDefinition 一致性 / 增量新建可见 / 目录删除防回归）

- [ ] **步骤 1：编写失败的测试**（在 `SkillCatalog.selfTest()` 内新增用例，断言规格如下）

```ts
// 用例 A：正文编辑触发重扫（核实实证：修复前稳定失败）
const base = await mkdtemp(join(tmpdir(), 'sp-mtime-'))
await mkdir(join(base, 'demo'))
await writeFile(join(base, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: v1\n---\nbody')
const cat = await SkillCatalog.fromDirectory(base)
if ((await cat.listCandidates('p', 10))[0].description !== 'v1') throw new Error('初始描述不对')
await new Promise((r) => setTimeout(r, 25))           // 规避 NTFS 毫秒级时间分辨率
await writeFile(join(base, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: v2\n---\nbody')
if ((await cat.listCandidates('p', 10))[0].description !== 'v2') throw new Error('编辑正文未触发重扫')

// 用例 B：getDefinition 与 list 同源（修后 list 已 v2，get 必须同 v2）
const c = (await cat.listCandidates('p', 10))[0]
const def = await cat.getDefinition(c, 'p')
if (!def || !def.content.includes('v2 的正文标记')) throw new Error('getDefinition 与 list 不同源')

// 用例 C：先建目录后写 SKILL.md，增量技能下一轮可见（核实实证：修复前稳定失败）
await mkdir(join(base, 'inc'))
if ((await cat.listCandidates('p', 10)).some((x) => x.name === 'inc')) throw new Error('空目录不应出现在清单')
await writeFile(join(base, 'inc', 'SKILL.md'), '---\nname: inc\ndescription: i\n---\nbody')
if (!(await cat.listCandidates('p', 10)).some((x) => x.name === 'inc')) throw new Error('增量新建未触发重扫')

// 用例 D：删除技能目录后下一轮移除（防回归，现有判据已覆盖）
await rm(join(base, 'demo'), { recursive: true, force: true })
if ((await cat.listCandidates('p', 10)).some((x) => x.name === 'demo')) throw new Error('删除目录未生效')
// finally: rm(base, { recursive: true, force: true })
```

- [ ] **步骤 2：运行破坏实测（确认用例 A、C 在旧实现上变红）**

运行：`node -e "tsx 或先 pnpm build 后引 lib"` —— 在改动前用真实 lib 产物跑新用例，预期：A、C FAIL（旧判据失明），B、D PASS 或 N/A。与核实报告一致。

- [ ] **步骤 3：实现三键聚合指纹**

在 `src/catalog.ts`：
- 新增私有字段 `private hidden: { dirMtimeMs: number; skillDirs: Set<string> } | null`（或等价结构），存储根目录 mtime + 根级技能目录名集合 + 每个技能目录 SKILL.md 的 mtime（Map，缺失为 null，可在 scan 循环已有的 `await stat(skillPath)` 处顺便记录，0 额外 stat）；
- `scan()` 末尾一次性写入指纹（中途 abort 不写，保持现状最终一致性；注释写明自愈路径）；
- `isDirModified()` 改为三键比较：根目录 stat.mtimeMs 与记录不等 => 变；根级 readdir 目录名集合与记录不等 => 变；任一 SKILL.md mtime 与记录不等 => 变；全等 => 未变。仅前两键通过才读 SKILL.md mtime（稳定场景 1 stat + 1 readdir）。
- 保留 `invalidate()` 清空指纹的语义。

- [ ] **步骤 4：运行测试确认通过**

运行：`pnpm build && node scripts/verify.mjs`，预期：boundary self-check 用例数从 11 升到 15，全部 PASS；`[verify] ALL PASS`。

- [ ] **步骤 5：破坏实测还原**

把步骤 3 的一处指纹比较故意写反（如 SKILL.md mtime 比较改为不等才复用），确认用例 A/C 变红；还原。

- [ ] **步骤 6：提交**

```bash
git add src/catalog.ts && git commit -m "fix(catalog): 快照失效判据升级为三键聚合指纹，失明窗口变可失败自检"
```

---

### 任务 2：verifyIntegrity().ok 语义补齐 + 自检（候选 2 靶点 A）

**文件：**
- 修改：`src/catalog.ts`（`verifyIntegrity()` 的 ok 判定）
- 测试：`SkillCatalog.selfTest()` 新增 1 条用例

**接口：**
- 消费：无
- 产出：`verifyIntegrity().ok` 语义与 verify.mjs 的判定一致（missingSkillMd 计入失败）

- [ ] **步骤 1：编写失败的测试**（selfTest 新增用例：构造「目录存在但 SKILL.md 缺失」的临时目录，断言 `verifyIntegrity().ok === false`）
- [ ] **步骤 2：运行确认失败**（现状 ok 漏 missingSkillMd → 用例红）
- [ ] **步骤 3：实现**：`verifyIntegrity()` 的 ok 改为 `duplicates.length === 0 && loadErrors.length === 0 && missingSkillMd.length === 0 && entries.every(!nameDrift)`
- [ ] **步骤 4：确认通过 + 破坏实测**（删掉 missingSkillMd 条件确认变红再还原）
- [ ] **步骤 5：提交**

---

### 任务 3：技能数量魔法数收敛为导出常量（候选 2 靶点 B）

**文件：**
- 修改：`src/catalog.ts`（新增 `export const EXPECTED_SKILL_COUNT = 15`）、`src/superpowers.ts`（具名再导出）、`scripts/verify.mjs:60`、`scripts/check-skill-switches.mjs`（3 处）
- 测试：无新断言（常量消费点即测试面）

**接口：**
- 消费：`EXPECTED_SKILL_COUNT`（`verify.mjs` 与 `check-skill-switches.mjs` 从 `../lib/superpowers.js` 具名导入）
- 产出：4 处 `15` 魔法数收敛

- [ ] **步骤 1：在 `src/catalog.ts` 导出常量**：`export const EXPECTED_SKILL_COUNT = 15`（注释说明：本包默认打包的技能数，门禁断言唯一事实源；新增技能时显式修改）
- [ ] **步骤 2：`src/superpowers.ts` 再导出**：`export { SkillCatalog, EXPECTED_SKILL_COUNT, type SpecificationReport } from './catalog.js'`
- [ ] **步骤 3：改消费点**：verify.mjs L60 与 check-skill-switches.mjs 的 L54/L93/L129 全部改引用 `EXPECTED_SKILL_COUNT`
- [ ] **步骤 4：验证**：`pnpm build && pnpm typecheck`、`node scripts/verify.mjs`、`node scripts/check-skill-switches.mjs` 全部 Exit 0
- [ ] **步骤 5：破坏实测**：临时把 `EXPECTED_SKILL_COUNT` 改为 16，确认四个消费点红；还原
- [ ] **步骤 6：提交**

---

### 任务 4：verify.mjs required 数组恒真/重复项清理（候选 2 靶点 C）

**文件：**
- 修改：`scripts/verify.mjs`（required 数组：删 `package.json` 与 5 个技能路径）

**接口：** 无

- [ ] **步骤 1：删除恒真项**：`package.json`（自身存在恒真）
- [ ] **步骤 2：删除与第 1 段重复项**：5 个 `skills/*/SKILL.md` 路径（`missingSkillMd` 检查已覆盖）
- [ ] **步骤 3：验证**：`node scripts/verify.mjs` ALL PASS
- [ ] **步骤 4：破坏实测**：临时把保留列表里 `scripts/check-same-name-priority.mjs` 改名为不存在，确认 MISSING 变红；还原
- [ ] **步骤 5：提交**

---

### 任务 5：候选 3 与候选 4 决策落地

**（决策以核实报告为准，本任务为收尾记录，可能无代码改动）**

- [ ] **步骤 1：候选 3（契约双源）决策**：按核实结论采取 做 / 不做，若做则在此展开实施步骤
- [ ] **步骤 2：候选 4（豁免矩阵表驱动）决策**：按核实结论维持 Speculative 不做，记录决策日志
- [ ] **步骤 3：附录观察项决策**：按核实结论处理被低估项（如 client-manifest 按索引比对脆弱点）
- [ ] **步骤 4：提交（如无代码则跳过）**

---

### 任务 6：全量门禁与记忆库收尾

**文件：** `CLAUDE.md`、`CONTEXT.md`

- [ ] **步骤 1：全量门禁**：`pnpm build && pnpm typecheck` + `verify.mjs` + 两个 check 脚本全部 Exit 0
- [ ] **步骤 2：CLAUDE.md 决策日志**：追加 2026-10-04 条目（三键聚合指纹 / EXPECTED_SKILL_COUNT / required 清理 / 候选 4 维持 Speculative 的理由）
- [ ] **步骤 3：CONTEXT.md**：更新 SkillCatalog 职责描述（指纹判据）与版本状态
- [ ] **步骤 4：提交**
