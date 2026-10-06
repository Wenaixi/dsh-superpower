# 贡献指南

本项目是 [obra/superpowers](https://github.com/obra/superpowers) 的 DSH 移植版。改动时同时顾着两头：跟上上游，以及贴合 DSH。

## 基本原则

- **同步上游**：v7.0.0 起技能名与目录回归上游命名（无 `superpower-` 前缀），整批同步了上游 `v6.4.2`。之后上游出新版本，按需 cherry-pick 合入并记进 `CHANGELOG.md`。
- **正文恒英文**：v7.5.1 起每个技能单份 `SKILL.md`，正文是上游英文原版（DSH 专属化）。frontmatter 同时声明英文 `description` 与中文 `description_zh`，门禁断言两条描述各带自己的 `Superpower Skill:` 前缀。代码、命令、路径、变量名保持原文不译。
- **i18n 边界**：面板 UI 文案必须走 `zh`/`en` 词典与 `t()` 取词，禁止渲染路径裸字符串。语言按钮只切技能描述与按钮自身文案，面板其余 UI 跟随宿主界面语言。
- **不引自建服务**：插件与技能正文不提供 HTTP / WebSocket 服务。可视化协作走宿主官方文档预览，配置写入走官方 `configForms` 通道。
- **废弃字段保留声明**：`modelDisabled` / `userDisabled` 已废弃，但 schema 声明与 `.volatile()` 都要留着。去掉声明会让旧配置被 schema 丢弃，去掉 `.volatile()` 会让迁移批里的 `unset` 被宿主写入闸门拒绝。
- **DSH 标准**：插件入口遵循 `dsh-plugin-dev` 的硬规则——`inject` 声明依赖、`Schemastery Config` 配默认值、副作用一律包在 `ctx.effect` 里、`waterfall` 记得调 `next()`。
- **失败要响亮**：frontmatter 非法时只跳过那一个技能并 `warn`，不静默吞错。

## 开发流程

```bash
pnpm install
pnpm build        # tsc -p tsconfig.build.json -> lib/
pnpm typecheck    # tsc --noEmit
node scripts/verify.mjs
dsh --profile demo --dump-config   # 应看到 "# == @wenaixi/dsh-superpower"
```

## 提交 PR

1. Fork 后从 `main` 切分支：`feat/xxx`、`fix/xxx` 或 `chore/sync-upstream-vX.Y.Z`。
2. 小步提交，一个技能或一篇文档一个 commit，信息用简体中文、动词开头。
3. 提交前跑一遍 `pnpm build && pnpm typecheck && node scripts/verify.mjs`，全绿再推。
4. PR 描述写清：关联的上游版本、改动范围、有没有动到 `rank` / `providerName` / `skillDir`。
5. 改到技能正文的话，说明 DSH 专属化（去图形符号、改写非 DSH 平台引用、补 DSH 小节）与工具映射是怎么处理的。

## 开发与发布流程

### 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node | `>=20` | 与 CI 一致（`engines.node` 声明 `>=20`） |
| pnpm | 本地 `>=11`；CI 固定 9 | 两个 workflow 都写 `pnpm/action-setup@v4` + `version: 9`，锁文件是 `lockfileVersion: 9.0`。DSH 本体面向 pnpm 11+（`nodeLinker: isolated` 符号链接隔离 + `allowBuilds` 构建审批），pnpm 10.x 在依赖较多的 profile 上处理依赖图会抛 `FATAL ERROR: invalid array length`，与内存无关。CI 用 9 只为保证构建可复现，本地跑 12 也能通过 |
| dsh | 最新 | `npm i -g @deepseek-ai/dsh` |

### 本地质量门禁（提交前必须全绿）

```bash
pnpm install
pnpm build          # tsc -p tsconfig.build.json
pnpm typecheck      # tsc --noEmit
node scripts/verify.mjs                      # 契约门禁：随包 shell 脚本 / 边界自检 22 条 / 符号扫描 / 自建服务禁令 / 图标与卡片元数据 / 双语 frontmatter 与 README 语言面
node scripts/check-skill-switches.mjs         # 技能开关端到端实测（真实 SkillRegistry）
node scripts/check-same-name-priority.mjs    # 同名裁决实测一（自研桩，无外部依赖）
node scripts/check-same-name-priority-fs.mjs # 同名裁决实测二（加载官方 filesystem）
node --test scripts/sync-engine.test.mjs      # 同步引擎的结构化结果契约
node scripts/client-manifest.test.mjs        # 客户端清单漂移判定
pnpm pack --dry-run                         # 打包清单
node scripts/review-sync.mjs                 # 上游同步全量复核（deep + tokens 双绿，需 SP_UPSTREAM 指向上游 skills/ 目录）
```

`verify.mjs` 打出 `ALL PASS`、两个同名裁决脚本与开关脚本都报「全部通过」，才算满足发布前置条件。

### 静态门禁测不到的部分：隔离实例验收

宿主的语义门禁只有真机能触发：Settings 的 volatile 路径校验、写入批次的原子性、客户端产物的长缓存与 rev。这三条一旦回归，静态断言与端到端脚本照样全绿，而真实拨一次开关就会失败。

改动面板版式、配置字段或客户端产物后，开一个隔离实例（只装 `dsh-base` + `dsh-web-app` + 本插件）并跑一遍：

```bash
dsh <新实例名> --from-default-profile web
dsh plugin --profile <新实例名> add file:<绝对路径>/wenaixi-dsh-superpower-<版本>.tgz
dsh --profile <新实例名> --port 3199 --no-open   # 启动日志里是带 token 的鉴权 URL

python scripts/browser/verify-switch-ui.py \
  http://127.0.0.1:3199 <token> .verify-shots <实例目录>/cordis.patch.yml .verify-shots/expected.json
python scripts/browser/verify-model-perception.py \
  http://127.0.0.1:3199 <token> <实例目录> <实例目录>/cordis.patch.yml .verify-shots
```

两个脚本会真实点开关、回读 `cordis.patch.yml` 落盘、再用宿主真实 `SkillRegistry` 复核两侧可见性。热装与热更新另需人工确认：跑着实例时 `dsh plugin --profile <实例名> add <新 tarball>`，免重启看面板页头「面板版本」是否变化。

### 发布流程（tag 触发全自动流水线）

发布交给 `.github/workflows/release.yml`：推送 `v*` 标签即自动完成 npm 发布与 GitHub Release 创建，本地不执行 `npm publish`。

```bash
# 1. 确认门禁全绿，且工作区干净
git status --short                 # 应无输出

# 2. 升版本号（patch 例：7.1.1）
#    编辑 package.json 的 version，字段值须与 tag 完全一致

# 3. 写 CHANGELOG
#    新增 "## [x.y.z] - YYYY-MM-DD" 段落。标题格式不能改，
#    release.yml 靠这个标题切出段落生成 GitHub Release 正文

# 4. 更新文档
#    README.md 的版本沿革与常见问题、CONTEXT.md 的当前版本、CLAUDE.md 的决策日志

# 5. 提交并推送
git add -A
git commit -m "chore(release): v7.1.1 — <本次变更摘要>"
git push origin main

# 6. 打标签并推送（触发 CI 发布）
git tag -a v7.1.1 -m "v7.1.1"
git push origin v7.1.1

# 7. 观察流水线
#    https://github.com/Wenaixi/dsh-superpower/actions
```

### 流水线的硬性约束

- **版本一致性**：`release.yml` 会校验 tag 与 `package.json` 的 `version` 是否一致，
  不一致直接失败。步骤 2 与步骤 6 必须使用同一版本号。
- **幂等保护**：若该版本已存在于 npm，流水线会跳过 publish 并给出 warning。
  tag 重推或 workflow 重跑不会造成重复发布假红。
- **CHANGELOG 段落必需**：缺了对应 `## [版本]` 段落，Release 正文只会退化成一句提示，不报错。发版前自己确认段落在。
- **registry 固定**：发布固定走 `https://registry.npmjs.org`，不受 runner 镜像配置或本机 `registry` 影响。
- **前置依赖**：仓库 Settings → Secrets and variables → Actions 里要配好 `NPM_TOKEN`（Classic Publish Token），否则发布步骤会显式报错并给出配置指引。

### 发版后验证

```bash
# 官方源确认（国内镜像同步有延迟，以官方源为准）
npm view @wenaixi/dsh-superpower version --registry https://registry.npmjs.org

# 实机安装验证：确认 tarball 内文件与仓库一致、无平台残留
pnpm pack
tar -tzf wenaixi-dsh-superpower-<version>.tgz | head -30
```

---

## 同步上游

```bash
git clone --depth 1 https://github.com/obra/superpowers.git ../superpowers

# PowerShell（Windows）
$env:SP_UPSTREAM = (Resolve-Path ../superpowers/skills).Path
node scripts/review-sync.mjs

# bash / zsh
SP_UPSTREAM=../superpowers/skills node scripts/review-sync.mjs
```

不设 `SP_UPSTREAM` 时脚本会退到 `%TEMP%/sp-upstream/skills`，找不到就报错，不会静默跳过。

### 与上游命名对齐：技能名无 `superpower-` 前缀（v7.0.0 起）

15 个技能的 `frontmatter.name` 与目录名都和上游一致（`brainstorming`、`writing-plans`、`diagnosing-superpowers` 等）。`v6.3.0-dsh.5` 曾经统一加 `superpower-` 前缀跟上游脱钩，`v7.0.0` 把这个决策反转回来：去掉前缀，同名时靠 rank 10 让本包胜出，于是同步上游不用手工改名。

**同名优先语义：** 官方注册表在同层重名时按 `rank → 提供方顺序 → 本地顺序` 裁决，rank 越小越优先。本包 rank 是 10，比 `dsh-skill-filesystem` 的项目级和用户级（100–500）以及官方内置 bundled（600）都小，同名一律本包胜出。同步上游新增技能时，目录和 frontmatter 直接用上游原名。

**每次同步上游新版本时：**

1. 拉上游 `skills/`，用 `SP_UPSTREAM` 指向它，再跑 `node scripts/review-sync.mjs`，看 deep 与 tokens 两段各自的差异报告。
2. 上游新增或改名的技能按原名同步进来，上游删掉的本地也删。
3. 正文保持上游英文原版，只做 DSH 专属化（去图形符号、改写非 DSH 平台引用、补 DSH 专属小节）；`using-superpowers/references/dsh-tools.md` 这类 DSH 专属文件保留。
4. 把所有文档里引用的技能名改成不带前缀的形式。
5. 跑 `pnpm build && pnpm typecheck && node scripts/verify.mjs`，再跑一次 `node scripts/review-sync.mjs` 确认无漂移，全绿再收工。
6. 同步完成后按本仓版本线发布，并在 `CHANGELOG.md` 记录所同步的上游版本

**目录名同步策略：** 目录名与 `frontmatter.name` 必须一致（`v6.3.0-dsh.9` 起硬重命名）；同步上游新增技能时目录与 frontmatter 使用同一名字，避免触发 Provider 的 name drift 警告。

---

有疑问请提 Issue，欢迎参与贡献。
