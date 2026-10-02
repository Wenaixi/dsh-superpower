# 贡献指南

感谢你对 `dsh-superpower` 感兴趣！本项目是 [obra/superpowers](https://github.com/obra/superpowers) 的 DSH 移植版，贡献时请兼顾“上游一致性”与“DSH 适配”。

## 基本原则

- **同步上游（v7.0.0 起）**：技能名与目录回归上游命名（无 `superpower-` 前缀），整批同步上游 `obra/superpowers v6.4.2`；后续上游新版本按需 cherry-pick 合入并记录于 `CHANGELOG.md`
- **中文化**：`skills/**/SKILL.md` 及辅助文档保持简体中文，代码/命令/路径/变量名不译
- **DSH 标准**：插件入口遵循 `dsh-plugin-dev` 技能的硬规则（`inject`、`Schemastery Config`、`ctx.effect` 清理、`waterfall next()` 等）
- **失败要响亮**：非法 frontmatter 仅跳过单技能并 `warn`，不静默吞错

## 开发流程

```bash
pnpm install
pnpm build        # tsc -p tsconfig.build.json -> lib/
pnpm typecheck    # tsc --noEmit
node scripts/verify.mjs
dsh --profile demo --dump-config   # 应看到 "# == @wenaixi/dsh-superpower"
```

## 提交 PR

1. Fork 本仓库，基于 `main` 新建分支（`feat/xxx` / `fix/xxx` / `chore/sync-upstream-vX.Y.Z`）
2. 小步提交：一个技能或一个文档一 commit，信息用简体中文、动词开头
3. 提交前确保 `pnpm build && pnpm typecheck && node scripts/verify.mjs` 全绿
4. PR 描述中注明：关联的上游版本、改动范围、是否影响 `rank` / `providerName` / `skillDir` 等配置
5. 涉及技能正文的改动，请说明中文化与 DSH 工具映射的处理

## 开发与发布流程

### 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node | `>=20` | 开发与 CI 一致 |
| pnpm | `>=11` | DSH 官方设计面向 pnpm 11+（`nodeLinker: isolated` + `allowBuilds`）。pnpm 10.x 在规模较大的 profile 上处理依赖图会触发 `FATAL ERROR: invalid array length`，与机器内存无关（8 GB 堆仍崩） |
| dsh | 最新 | `npm i -g @deepseek-ai/dsh` |

### 本地质量门禁（提交前必须全绿）

```bash
pnpm install
pnpm build          # tsc -p tsconfig.build.json
pnpm typecheck      # tsc --noEmit
node scripts/verify.mjs                      # 契约门禁：伴生脚本 / 边界自检 8/8 / emoji
node scripts/check-same-name-priority.mjs    # 同名裁决实测一（自研桩，无外部依赖）
node scripts/check-same-name-priority-fs.mjs # 同名裁决实测二（加载官方 filesystem）
node scripts/review-sync.mjs                 # 上游同步全量复核（deep + tokens 双绿）
```

`verify.mjs` 的 `ALL PASS` 与两个同名裁决脚本的 `全部通过` 均为发布前置条件。

### 发布流程（tag 触发全自动流水线）

发布由 `.github/workflows/release.yml` 接管：**推送 `v*` 标签即自动完成
npm 发布与 GitHub Release 创建**，本地不需要执行 `npm publish`。

```bash
# 1. 确认门禁全绿，且工作区干净
git status --short                 # 应无输出

# 2. 升版本号（patch 例：7.1.1）
#    编辑 package.json 的 version，字段值须与 tag 完全一致

# 3. 写 CHANGELOG
#    新增 "## [x.y.z] - YYYY-MM-DD" 段落，标题格式不可变更，
#    release.yml 依据该标题提取段落生成 GitHub Release 正文

# 4. 更新文档
#    README.md 的前置要求与版本说明、CLAUDE.md 的当前版本与决策日志

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
- **CHANGELOG 段落必需**：缺失对应 `## [版本]` 段落时，Release 正文会退化为
  一句提示而非报错。发版前务必确认段落存在。
- **registry 固定**：发布始终走 `https://registry.npmjs.org`，不受 runner
  镜像配置或本机 `registry` 设置影响。
- **前置依赖**：仓库 Settings → Secrets and variables → Actions 需配置 `NPM_TOKEN`
  （Classic Publish Token），否则发布步骤会显式报错并给出配置指引。

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

本仓库 15 个技能的 `frontmatter.name` 与目录名与上游完全一致（`brainstorming`、`writing-plans`、`diagnosing-superpowers` …）。`v6.3.0-dsh.5` 曾统一加 `superpower-` 前缀与上游脱钩，`v7.0.0` 起反转该决策（去前缀；同名前由 rank 10 保证本插件胜出，与上游同步无需手工改名）。

**同名优先语义：** 官方注册表同层重名按 `rank → 提供方顺序 → 本地顺序` 裁决，**rank 越小优先级越高**；本包 rank 10 小于 `dsh-skill-filesystem` 的项目/用户根（100–500）与官方 bundled（600），本插件技能优先级最高，同名技能一律本包胜出。同步上游新增技能时目录与 frontmatter 使用上游原名即可，无需加前缀。

**每次同步上游新版本时：**

1. 拉取上游 `skills/` 与本仓库 `skills/` 逐目录对比
2. 对每个上游技能新增 / 改名 / 删除的技能：按上游原名同步（新增技能）或同步删除本地对应技能
3. 同步中文化正文与新增的辅助文档（保留 `using-superpowers/references/dsh-tools.md` 等 DSH 专属文件）
4. 同步更新所有文档里引用的技能名（无前缀）
5. 跑 `pnpm build && pnpm typecheck && node scripts/verify.mjs` 全绿
6. 同步完成后按本仓版本线发布，并在 `CHANGELOG.md` 记录所同步的上游版本

**目录名同步策略：** 目录名与 `frontmatter.name` 必须一致（`v6.3.0-dsh.9` 起硬重命名）；同步上游新增技能时目录与 frontmatter 使用同一名字，避免触发 Provider 的 name drift 警告。

---

有疑问请提 Issue，欢迎参与贡献。
