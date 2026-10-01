---
name: using-git-worktrees
description: "适用于需与当前工作区隔离的功能开发或执行实现计划前，通过原生工具优先、git worktree 兜底的方式确保独立工作区就绪"
---

# 使用 Git Worktree

## 概述

确保所有工作都在独立工作区中进行。优先使用平台原生的 worktree 工具，仅在无原生工具可用时再回退到手动 git worktree。

**核心原则：** 先检测是否已处于隔离环境，再使用原生工具，最后回退到 git。不要与 harness 对抗。

**开始时声明：** “我正在使用 using-git-worktrees 技能来创建独立工作区。”

## 步骤 0：检测现有隔离状态

**在创建任何内容之前，先检查是否已处于独立工作区中。**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**子模块防护：** `GIT_DIR != GIT_COMMON` 在 git 子模块中同样为真。在判定“已处于 worktree”之前，需先确认是否处于子模块中：

```bash
# 若返回路径，则处于子模块而非 worktree——按常规仓库处理
git rev-parse --show-superproject-working-tree 2>/dev/null
```

**若 `GIT_DIR != GIT_COMMON`（且不在子模块中）：** 说明已处于关联 worktree 中。跳至步骤 2（项目初始化），不要再创建新的 worktree。

按分支状态报告：
- 处于分支上：“已在独立工作区 `<path>`，分支为 `<name>`。”
- 游离 HEAD：“已在独立工作区 `<path>`（游离 HEAD，外部托管），结束时需创建分支。”

**若 `GIT_DIR == GIT_COMMON`（或处于子模块中）：** 说明处于常规仓库检出状态。

用户是否已在指令中表明 worktree 偏好？若无，请在创建 worktree 前征得同意：

> “是否需要我为你创建一个独立 worktree？它可以保护当前分支不受改动影响。”

若已存在明确偏好则直接遵循，无需询问。若用户拒绝，则在原地工作并跳至步骤 2。

## 步骤 1：创建独立工作区

**你有两种机制，请按以下顺序尝试。**

### 1a. 原生 Worktree 工具（优先）

用户已请求独立工作区（步骤 0 已获同意）。你是否已有创建 worktree 的方式？可能是名为 `EnterWorktree`、`WorktreeCreate`、`/worktree` 命令或 `--worktree` 参数的工具。如果有，请直接使用并跳至步骤 2。

原生工具会自动处理目录选址、分支创建和清理。使用 `git worktree add` 而绕过原生工具会产生 harness 无法感知和管理的幽灵状态。

仅在无原生 worktree 工具可用时，才进入步骤 1b。

### 1b. Git Worktree 兜底方案

**仅在步骤 1a 不适用时使用**——即你没有可用的原生 worktree 工具时，才手动通过 git 创建 worktree。

#### 目录选择

按以下优先级选择目录，用户的显式偏好始终优先于已观测到的文件系统状态。

1. **检查指令中是否已声明 worktree 目录偏好。** 如用户已指定，直接使用，无需询问。

2. **检查是否存在项目本地的 worktree 目录：**
   ```bash
   ls -d .worktrees 2>/dev/null     # 优先（隐藏目录）
   ls -d worktrees 2>/dev/null      # 备选
   ```
   如存在则直接使用；若两者都存在，以 `.worktrees` 为准。

3. **若无其他指引**，默认为项目根目录下的 `.worktrees/`。

#### 安全性校验（仅针对项目本地目录）

**创建 worktree 前必须确认目录已被忽略：**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**若未被忽略：** 加入 .gitignore 并提交该改动后再继续。

**为何关键：** 防止将 worktree 内容误提交到仓库。

#### 创建 Worktree

```bash
# 根据所选位置确定路径
path="$LOCATION/$BRANCH_NAME"

git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**沙盒兜底：** 若 `git worktree add` 因权限错误（沙盒拒绝）失败，请告知用户沙盒已阻止 worktree 创建，改为在当前目录继续工作，并在原地完成初始化与基线测试。

## 步骤 2：项目初始化

自动检测并执行对应的初始化：

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

## 步骤 3：验证干净基线

运行测试以确保工作区初始状态干净：

```bash
# 使用项目对应的命令
npm test / cargo test / pytest / go test ./...
```

**若测试失败：** 报告失败情况，询问是否继续或先行排查。

**若测试通过：** 报告就绪。

### 报告

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## 快速参考

| 场景 | 操作 |
|-----------|--------|
| 已处于关联 worktree | 跳过创建（步骤 0） |
| 处于子模块中 | 视为常规仓库（步骤 0 防护） |
| 存在原生 worktree 工具 | 使用原生工具（步骤 1a） |
| 无原生工具 | 使用 Git worktree 兜底（步骤 1b） |
| `.worktrees/` 已存在 | 使用它（校验是否已忽略） |
| `worktrees/` 已存在 | 使用它（校验是否已忽略） |
| 两者都存在 | 使用 `.worktrees/` |
| 两者都不存在 | 先检查指令文件，再默认使用 `.worktrees/` |
| 目录未被忽略 | 加入 .gitignore 并提交 |
| 创建时权限错误 | 沙盒兜底，原地工作 |
| 基线测试失败 | 报告失败并询问 |
| 无 package.json/Cargo.toml | 跳过依赖安装 |

## 常见托词

| 托词 | 实际情况 |
|--------|---------|
| “我显然不在 worktree 里，没必要检查” | 执行步骤 0。harness 创建的隔离和子模块都会让肉眼判断失误，用检测命令才能确定。 |
| “`git worktree add` 比到处找原生工具更快” | 原生工具（如 `EnterWorktree`）负责选址、分支和清理。绕过它是头号错误——会产生 harness 无法感知和管理的幽灵状态。 |
| “worktree 目录肯定已经被忽略了” | 请执行 `git check-ignore`。未被忽略的 worktree 目录会把整个工作树提交进仓库。 |
| “随便起个目录名都行” | 显式指令优先于已存在的项目本地目录，项目本地目录优先于 `.worktrees/` 默认值。 |
| “工作区是全新的，基线测试可以等等再跑” | 脏基线会让后续所有失败变得无法定位。现在就跑测试；是否带病继续由你的协作人决定。 |
