# 贡献指南

感谢你对 `dsh-superpower` 感兴趣！本项目是 [obra/superpowers](https://github.com/obra/superpowers) 的 DSH 移植版，贡献时请兼顾“上游一致性”与“DSH 适配”。

## 基本原则

- **版本号与上游同步**：`package.json#version` 严格跟随上游 `obra/superpowers`，不要自行 bump 大版本
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

### 与上游脱钩：name 永久加 `superpower-` 前缀

本仓库 14 个技能的 `frontmatter.name` 已统一加 `superpower-` 前缀（如 `superpower-brainstorming`、`superpower-using-superpowers`），**与上游 `obra/superpowers` 永久脱钩**。上游仍叫 `brainstorming`、`using-superpowers`，本仓库叫 `superpower-brainstorming`、`superpower-using-superpowers`。

**为何脱钩：**

- DSH 上游 `isSkillName = /^[a-z0-9]+(-[a-z0-9]+)*$/` 拒绝冒号与下划线，只能走 kebab-case 短横线
- 上游 Claude Code 习惯的 `/skill superpowers:<name>`（冒号）在 DSH 下不被识别
- 加 `superpower-` 前缀后，前端 `/skill superpower-brainstorming` 与模型 `skill("superpower-brainstorming")` 均能直接工作
- 与上游同步的代价是手工改名 14 处（见下）

**每次同步上游新版本时（如 `v6.4.0`、`v6.5.0`）：**

1. 拉取上游 `skills/` 与本仓库 `skills/` 逐目录对比
2. 对每个上游技能新增 / 改名 / 删除的技能：把 `frontmatter.name` 改为 `superpower-<kebab>`（新增技能）或同步删除本地对应技能
3. 同步中文化正文与新增的辅助文档
4. 同步更新所有文档里引用的旧名（`superpowers:<x>` → `superpower-<x>`）
5. 跑 `pnpm build && pnpm typecheck && node scripts/verify.mjs` 全绿
6. **不** bump `package.json#version` 的基线（如 `6.3.0` 改为 `6.4.0` 应等上游正式发版，本仓跟随），仅以 `-dsh.N` 演进

**目录名同步策略：** 目录名保持原 `<kebab>` 不变（避免 git diff 中的重命名噪音）。Provider 已有 `frontmatter.name 偏离目录名时以 frontmatter 为准并 warn` 的逻辑（见 `src/superpowers.ts`），不影响加载。

---

有疑问请提 Issue，欢迎喵～
