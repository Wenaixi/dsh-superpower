# 贡献指南

本项目是 [obra/superpowers](https://github.com/obra/superpowers) 的 DSH 移植版。改动时同时顾着两头：跟上上游，以及贴合 DSH。

## 基本原则

- **同步上游**：v7.0.0 起技能名与目录回归上游命名（无 `superpower-` 前缀），整批同步了上游 `v6.4.2`。之后上游出新版本，按需 cherry-pick 合入并记进 `CHANGELOG.md`。
- **中文化**：`skills/**/SKILL.md` 与辅助文档保持简体中文，代码、命令、路径、变量名不译。
- **i18n 边界**：面板 UI 文案必须走 `zh`/`en` 词典与 `t()` 取词，禁止渲染路径裸字符串；技能名与描述固定中文，不做技能级翻译。
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
5. 改到技能正文的话，说明中文化和 DSH 工具映射是怎么处理的。

## 开发与发布流程

### 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node | `>=20` | 与 CI 一致 |
| pnpm | `>=11` | DSH 官方设计面向 pnpm 11+（`nodeLinker: isolated` 符号链接隔离 + `allowBuilds` 构建审批）。pnpm 10.x 在依赖较多的 profile 上处理依赖图会抛 `FATAL ERROR: invalid array length`，与内存无关，8 GB 堆照样崩 |
| dsh | 最新 | `npm i -g @deepseek-ai/dsh` |

### 本地质量门禁（提交前必须全绿）

```bash
pnpm install
pnpm build          # tsc -p tsconfig.build.json
pnpm typecheck      # tsc --noEmit
node scripts/verify.mjs                      # 契约门禁：伴生脚本 / 边界自检 / 符号扫描 / 图标与卡片元数据 / UI i18n 取词
node scripts/check-skill-switches.mjs         # 技能开关端到端实测（真实 SkillRegistry）
node scripts/check-same-name-priority.mjs    # 同名裁决实测一（自研桩，无外部依赖）
node scripts/check-same-name-priority-fs.mjs # 同名裁决实测二（加载官方 filesystem）
node scripts/review-sync.mjs                 # 上游同步全量复核（deep + tokens 双绿）
```

`verify.mjs` 打出 `ALL PASS`、两个同名裁决脚本与开关脚本都报「全部通过」，才算满足发布前置条件。

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
#    README.md 的版本沿革与常见问题、CLAUDE.md 的当前版本与决策日志

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
git clone --depth 1 https://github.com/obra/superpowers.git /tmp/superpowers
# 对比 skills/ 与 package.json#version
# 保留 references/dsh-tools.md 等 DSH 专属文件
```

### 与上游命名对齐：技能名无 `superpower-` 前缀（v7.0.0 起）

15 个技能的 `frontmatter.name` 与目录名都和上游一致（`brainstorming`、`writing-plans`、`diagnosing-superpowers` 等）。`v6.3.0-dsh.5` 曾经统一加 `superpower-` 前缀跟上游脱钩，`v7.0.0` 把这个决策反转回来：去掉前缀，同名时靠 rank 10 让本包胜出，于是同步上游不用手工改名。

**同名优先语义：** 官方注册表在同层重名时按 `rank → 提供方顺序 → 本地顺序` 裁决，rank 越小越优先。本包 rank 是 10，比 `dsh-skill-filesystem` 的项目级和用户级（100–500）以及官方内置 bundled（600）都小，同名一律本包胜出。同步上游新增技能时，目录和 frontmatter 直接用上游原名。

**每次同步上游新版本时：**

1. 拉上游 `skills/`，跟本仓库 `skills/` 逐目录对比。
2. 上游新增或改名的技能按原名同步进来，上游删掉的本地也删。
3. 正文和新增的辅助文档一起中文化，`using-superpowers/references/dsh-tools.md` 这类 DSH 专属文件保留。
4. 把所有文档里引用的技能名改成不带前缀的形式。
5. 跑 `pnpm build && pnpm typecheck && node scripts/verify.mjs`，全绿再收工。
6. 同步完成后按本仓版本线发布，并在 `CHANGELOG.md` 记录所同步的上游版本

**目录名同步策略：** 目录名与 `frontmatter.name` 必须一致（`v6.3.0-dsh.9` 起硬重命名）；同步上游新增技能时目录与 frontmatter 使用同一名字，避免触发 Provider 的 name drift 警告。

---

有疑问请提 Issue，欢迎参与贡献。
