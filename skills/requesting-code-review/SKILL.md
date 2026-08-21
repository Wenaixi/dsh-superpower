---
name: requesting-code-review
description: "在任务完成、重大功能实现或准备合并到主分支时发起，用于校验实现是否符合需求与质量标准，建议定期执行"
---

# 请求代码评审

派发代码评审子代理，提前发现问题，避免问题级联扩散。评审者仅获得为评估而精确构造的上下文——而非你的完整会话历史。

**核心原则：** 尽早评审，频繁评审。

## 何时请求评审

**必做：**
- 子代理驱动开发中，完成每个任务后
- 完成重大功能后
- 合并到主分支前

**可选但很有价值：**
- 遇到卡点时（换个视角）
- 重构前（建立基线检查）
- 修复复杂缺陷后

## 如何发起请求

**1. 获取 git SHA：**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # 或 origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. 派发代码评审子代理：**

派发一个 `general-purpose` 子代理，并按 [code-reviewer.md](code-reviewer.md) 中的模板填入信息

**占位符说明：**
- `{DESCRIPTION}` - 本次构建内容的简要总结
- `{PLAN_OR_REQUIREMENTS}` - 预期应实现的功能/需求说明
- `{BASE_SHA}` - 起始提交
- `{HEAD_SHA}` - 结束提交

**3. 处理反馈：**
- 立即修复 Critical 级别问题
- 在继续下一步前修复 Important 级别问题
- 记录 Minor 级别问题，择机处理
- 若评审意见有误，带上理由进行反驳

## 示例

```
[刚刚完成任务 2：添加校验函数]

你：先请求一次代码评审再继续。

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[派发代码评审子代理]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[子代理返回]：
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

你：[修复进度提示]
[继续任务 3]
```

## 常见借口与现实

| 借口 | 现实 |
|--------|---------|
| “我自己看一下 diff 就行，没必要再派评审” | 你是协调者——在行内直接看 diff 会消耗你本该用于推进工作的上下文窗口。派发评审子代理：diff 与评估都在它的上下文中完成，回传给你的只有结论。 |
| “评审者需要我的完整会话历史才能看懂改动” | 只给它为评估而精确构造的上下文，绝不给完整会话历史。这样评审者关注的是工作产物本身，而非你的思考过程。 |

## 红线

**切勿：**
- 因为“很简单”就跳过评审
- 忽略 Critical 级别问题
- 带着未修复的 Important 级别问题继续推进
- 与正确的技术反馈争辩

**若评审有误：**
- 用技术理由反驳
- 用代码/测试证明其可行
- 请求进一步澄清

模板见：[code-reviewer.md](code-reviewer.md)
