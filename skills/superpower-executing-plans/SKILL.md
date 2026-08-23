---
name: superpower-executing-plans
description: "适用于已有详细实现计划的场景，在隔离会话中逐项执行、严格校验并在关键节点复核的执行流程"
---

# 执行计划

## 概述

加载计划、批判性复审、执行全部任务、完成后汇报。

**开始时声明：** "I'm using the executing-plans skill to implement this plan."

**提示：** 告知你的协作伙伴，Superpowers 在可使用 subagent 时效果更好（Claude Code、Codex CLI、Codex App、Copilot CLI 和 Gemini CLI 均符合条件；各平台工具说明见 `../using-superpowers/references/`）。如可使用 subagent，请使用 superpower-subagent-driven-development 替代本 skill。

## 执行流程

### 步骤 1：加载并复审计划
1. 确保工作区已隔离：使用 superpower-using-git-worktrees 创建新工作区或校验现有工作区
2. 读取计划文件
3. 批判性复审——识别计划中的疑问或风险点
4. 如有疑问：开始前向协作伙伴提出
5. 如无疑问：为计划条目创建 todos 并继续执行

### 步骤 2：执行任务

针对每项任务：
1. 标记为 in_progress
2. 严格按步骤执行（计划已拆分为小粒度步骤）
3. 按要求执行校验
4. 标记为 completed

### 步骤 3：完成开发

所有任务完成并校验通过后：
- 声明："I'm using the finishing-a-development-branch skill to complete this work."
- **必选子 skill：** 使用 superpower-finishing-a-development-branch
- 按该 skill 流程校验测试、提供选项并执行所选方案

## 何时停止并寻求帮助

**出现以下情况时立即停止执行：**
- 遇到阻碍（缺失依赖、测试失败、指令不清晰）
- 计划存在关键缺口导致无法启动
- 无法理解某条指令
- 校验反复失败

**不要猜测，主动澄清。**

## 何时回溯到 earlier 步骤

**回到复审（步骤 1），当：**
- 协作伙伴根据你的反馈更新了计划
- 基础方案需要重新思考

**不要强行突破阻碍**——停下来并提问。

## 牢记
- 首先对计划进行批判性复审
- 严格按计划步骤执行
- 不要跳过校验
- 计划要求引用 skill 时按要求引用
- 受阻时停止，不要猜测
- 未经用户明确同意，绝不在 main/master 分支上开始实现
