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
dsh --profile demo --dump-config   # 应看到 "# == dsh-superpower"
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

有疑问请提 Issue，欢迎喵～
