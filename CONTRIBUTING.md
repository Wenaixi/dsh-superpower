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

## 同步上游

```bash
git clone --depth 1 https://github.com/obra/superpowers.git /tmp/superpowers
# 对比 skills/ 与 package.json#version
# 保留 references/dsh-tools.md 等 DSH 专属文件
```

### 与上游命名对齐：技能名无 `superpower-` 前缀（v7.0.0 起）

本仓库 15 个技能的 `frontmatter.name` 与目录名与上游完全一致（`brainstorming`、`writing-plans`、`diagnosing-superpowers` …）。`v6.3.0-dsh.5` 曾统一加 `superpower-` 前缀与上游脱钩，`v7.0.0` 起反转该决策（去前缀 + 同名外来技能优先语义下前缀失去防护意义，且与上游同步不再需要手工改名）。

**同名优先语义：** 官方注册表同层重名按 `rank → 提供方顺序 → 本地顺序` 裁决；本包 rank 550 高于 `dsh-skill-filesystem` 的项目/用户根（100–500），用户或项目自行安装的同名技能天然优先。同步上游新增技能时目录与 frontmatter 使用上游原名即可，无需加前缀。

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
