---
name: finishing-a-development-branch
description: "实现完成且全部测试通过后，用于决定分支集成方式，支持本地合并、创建 PR 或保留分支等完整收尾流程。"
---

# 完成开发分支

## 概述

**核心原则：** 验证测试 → 检测环境 → 提供选项 → 执行选择 → 清理收尾。

**开始时声明：** “我将使用 finishing-a-development-branch 技能来完成收尾工作。”

## 步骤 1：验证测试

运行项目的完整测试套件（`npm test` / `cargo test` / `pytest` / `go test ./...`）。

**若测试失败**，报告失败信息并停止——只有测试全通过后才展示选项菜单：

```
测试未通过（<N> 项失败），需修复后才能完成：

[展示失败详情]
```

**若测试通过：** 继续进入步骤 2。

## 步骤 2：检测环境

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
# Capture now, while still inside the workspace — Step 5 changes directory
# before cleanup (Step 6) needs this value
WORKTREE_PATH=$(git rev-parse --show-toplevel)
```

下表决定展示哪种菜单以及如何执行清理：

| 状态 | 菜单 | 清理方式 |
|-------|------|---------|
| `GIT_DIR == GIT_COMMON`（普通仓库） | 标准 3 项选项 | 无需清理 worktree |
| `GIT_DIR != GIT_COMMON`，具名分支 | 标准 3 项选项 | 按来源判定（见步骤 6） |
| `GIT_DIR != GIT_COMMON`，游离 HEAD | 精简 2 项选项（无合并） | 由外部托管——保持原样 |

## 步骤 3：确定基线分支

基线分支即本次工作分叉时的来源分支——通常在计划、对话记录或分支的上游中已注明。若尚未明确，请询问：“该分支是从 <你的最佳推测> 分叉出来的，这样对吗？” 合并前务必确认：合错基线分支的回滚成本很高。

## 步骤 4：提供选项

**普通仓库与具名分支 worktree——请严格按以下 3 项呈现：**

```
实现已完成。接下来怎么处理？

1. 本地合并回 <base-branch>
2. 推送并创建 Pull Request
3. 保持分支现状（稍后自行处理）

请选择：
```

**游离 HEAD——请严格按以下 2 项呈现：**

```
实现已完成。当前处于游离 HEAD（外部托管的工作区）。

1. 以新分支推送并创建 Pull Request
2. 保持现状（稍后自行处理）

请选择：
```

请严格按原文呈现菜单——保持简洁，所有选项均来自上表。仅当人类协作者明确要求丢弃工作时才处理丢弃流程（见下文“若协作者要求丢弃工作”）。等待对方答复；集成决策权归协作者所有。

## 步骤 5：执行选择

### 选项 1：本地合并

```bash
# Get main repo root for CWD safety
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"

# Merge first — verify success before removing anything
git checkout <base-branch>
git pull
git merge <feature-branch>

# Verify tests on merged result
<test command>
```

若合并后的测试失败：立即停止，保留 worktree 与分支并展开排查——此时尚未推送，合并仅在本地，可恢复。

合并结果测试通过后：清理 worktree（步骤 6），然后删除分支：

```bash
git branch -d <feature-branch>
```

### 选项 2：推送并创建 PR

```bash
git push -u origin <feature-branch>
# From a detached HEAD, name the new branch on the remote:
# git push origin HEAD:refs/heads/<new-branch>
```

然后针对 <base-branch> 创建 pull/merge request——优先使用代码托管平台的命令行工具，若无则使用推送后打印的创建链接——遵循仓库现有的 PR 模板与规范，并将 URL 汇报给协作者。

保留 worktree——协作者将在此处理 PR 反馈并继续迭代。

### 选项 3：保持现状

汇报：“已保留分支 <name>，worktree 保留于 <path>。”

### 若协作者要求丢弃工作

此路径仅在明确要求丢弃工作时触发，需先进行确认：

```
此操作将永久删除：
- 分支 <name>
- 全部提交：<commit-list>
- 位于 <path> 的 worktree

请输入 'discard' 以确认。
```

等待该确切确认。确认后：

```bash
MAIN_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
cd "$MAIN_ROOT"
```

然后清理 worktree（步骤 6）并强制删除分支：

```bash
git branch -D <feature-branch>
```

## 步骤 6：清理工作区

**仅在选项 1 与已确认的丢弃操作中执行。** 选项 2 与选项 3 始终保留 worktree。两种调用方已切换至主仓库根目录——worktree 移除必须在 worktree 外部执行——并使用步骤 2 捕获的 `GIT_DIR`/`GIT_COMMON`/`WORKTREE_PATH` 值（目录切换前已保存）。

**若 `GIT_DIR == GIT_COMMON`：** 普通仓库，无需清理 worktree，流程结束。

**若 `WORKTREE_PATH` 位于 `.worktrees/` 或 `worktrees/` 之下：** 该 worktree 由 Superpowers 创建——由我们负责清理：

```bash
git worktree remove "$WORKTREE_PATH"
git worktree prune  # Self-healing: clean up any stale registrations
```

**若移除被拒绝**（提示 `contains modified or untracked files`）：说明 worktree 中存在仅存于此的未提交文件——可能是计划、笔记或临时文件。切勿自行使用 `--force`。向协作者展示涉及的文件并征询意见：

```bash
git -C "$WORKTREE_PATH" status --porcelain -uall
```

```
worktree 移除被拒绝——以下文件尚未提交：

<file list>

1. 清理前提交至 <branch>
2. 移动至 <主仓库根目录>
3. 删除（不可恢复）

请选择：
```

按选择执行，随后移除 worktree。

**其他情况：** 该工作区由宿主环境托管——保持原样。若平台提供了工作区退出工具，请使用它。

## 快速参考

| 选项 | 合并 | 推送 | 保留 Worktree | 清理分支 |
|--------|-------|------|---------------|----------------|
| 1. 本地合并 | 是 | - | - | 是 |
| 2. 创建 PR | - | 是 | 是 | - |
| 3. 保持现状 | - | - | 是 | - |
| 丢弃（仅在明确要求时） | - | - | - | 是（强制） |

## 常见借口与实际情况

| 借口 | 实际情况 |
|--------|---------|
| “本会话早些时候测试已通过” | 请在即将集成的代码树上重新运行完整测试套件，一次通过仅能证明当时的代码树。 |
| “他们显然想直接合并” | 集成方式由协作者决定，请呈现菜单并等待选择。 |
| “他们似乎已完成该功能——我来提议丢弃吧” | 菜单已完整，无需额外提议，仅当协作者明确要求丢弃时才处理。 |
| “‘好，删掉吧’也算确认” | 只有输入 `discard` 才视为有效确认并授权删除。 |
| “PR 已提交，worktree 就是冗余了” | PR 反馈需在该 worktree 中修复，工作落盘前应予以保留。 |
| “这个 worktree 看起来废弃了——顺手一起清理” | 仅清理位于 `.worktrees/` 或 `worktrees/` 下的 worktree，其余均归宿主环境所有。 |
| “移除被拒——用 `--force` 收个尾就行” | 拒绝意味着文件仅存在于该 worktree，`--force` 会永久销毁它们，请向协作者展示并征询意见。 |
| “合并后失败大概是偶发问题” | 合并结果失败则立即中止，保留分支与 worktree 以便排查。 |
| “基线分支显然是 main” | 请确认分叉点或主动询问，合错基线的回滚成本很高。 |
| “推送被拒——强制推送就能解决” | 推送被拒说明远端已有更新，请先排查；仅在协作者明确要求时才执行强制推送。 |
