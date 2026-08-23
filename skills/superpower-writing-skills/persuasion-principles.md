# Skill 设计中的说服原则

## 概述

大语言模型与人类一样，会对相同的说服原则做出反应。理解这一心理机制有助于你设计更有效的 Skill —— 目的不是操纵，而是确保关键实践即使在压力下也能被切实执行。

**研究基础：** Meincke 等人（2025）通过 N=28,000 次 AI 对话测试了 7 项说服原则。运用说服技巧后，依从率提升了一倍以上（33% → 72%，p < .001）。

## 七大原则

### 1. 权威（Authority）
**定义：** 对专业能力、资质或官方来源的服从。

**在 Skill 中的作用：**
- 祈使性语言："YOU MUST"、"Never"、"Always"
- 不可协商的表述："No exceptions"
- 消除决策疲劳与合理化借口

**适用场景：**
- 约束执行类 Skill（TDD、校验要求等）
- 安全攸关的关键实践
- 已确立的最佳实践

**示例：**
```markdown
✅ Write code before test? Delete it. Start over. No exceptions.
❌ Consider writing tests first when feasible.
```

### 2. 承诺一致（Commitment）
**定义：** 与既往行为、陈述或公开声明保持一致。

**在 Skill 中的作用：**
- 要求显式声明："Announce skill usage"
- 强制显式选择："Choose A, B, or C"
- 使用追踪机制：用 todos 管理清单

**适用场景：**
- 确保 Skill 被切实执行
- 多步骤流程
- 责任追溯机制

**示例：**
```markdown
✅ When you find a skill, you MUST announce: "I'm using [Skill Name]"
❌ Consider letting your partner know which skill you're using.
```

### 3. 稀缺（Scarcity）
**定义：** 由时间限制或资源有限所产生的紧迫感。

**在 Skill 中的作用：**
- 时限性要求："Before proceeding"
- 顺序依赖："Immediately after X"
- 防止拖延

**适用场景：**
- 需要立即校验的场景
- 时效性强的工作流
- 防止“稍后再做”

**示例：**
```markdown
✅ After completing a task, IMMEDIATELY request code review before proceeding.
❌ You can review code when convenient.
```

### 4. 社会认同（Social Proof）
**定义：** 遵从他人的行为或被视为常规的做法。

**在 Skill 中的作用：**
- 普适性表述："Every time"、"Always"
- 失败模式："没有 Y 的 X = 失败"
- 建立行为规范

**适用场景：**
- 记录通用实践
- 警示常见失败原因
- 强化标准规范

**示例：**
```markdown
✅ Checklists without todo tracking = steps get skipped. Every time.
❌ Some people find a todo list helpful for checklists.
```

### 5. 归属感（Unity）
**定义：** 共享身份、“我们”意识、群体归属感。

**在 Skill 中的作用：**
- 协作性表述："our codebase"、"we're colleagues"
- 共同目标："we both want quality"

**适用场景：**
- 协作类工作流
- 建立团队文化
- 非层级化的实践

**示例：**
```markdown
✅ We're colleagues working together. I need your honest technical judgment.
❌ You should probably tell me if I'm wrong.
```

### 6. 互惠（Reciprocity）
**定义：** 对已获利益产生回报的义务感。

**作用方式：**
- 需谨慎使用 —— 容易显得带有操纵性
- 在 Skill 中很少需要

**应避免的场景：**
- 几乎所有情况（其他原则通常更有效）

### 7. 喜好（Liking）
**定义：** 更倾向于与自己喜欢的人合作。

**作用方式：**
- **不要用于提升依从性**
- 与坦诚反馈的文化相冲突
- 会导致迎合行为

**应避免的场景：**
- 所有需要强制执行纪律的场景

## 按 Skill 类型组合原则

| Skill 类型 | 适用原则 | 规避原则 |
|------------|-----|-------|
| 约束执行类 | 权威 + 承诺一致 + 社会认同 | 喜好、互惠 |
| 指导/技巧类 | 适度权威 + 归属感 | 过度权威 |
| 协作类 | 归属感 + 承诺一致 | 权威、喜好 |
| 参考资料类 | 仅需清晰表达 | 全部说服原则 |

## 为何有效：背后的心理学

**清晰的底线规则能减少合理化借口：**
- "YOU MUST" 消除了决策疲劳
- 绝对化的表述消除了“这是不是例外？”的疑问
- 显式的反合理化话术能精准堵住特定漏洞

**执行意图能形成自动化行为：**
- 清晰的触发条件 + 必要行动 = 自动执行
- "当 X 时，做 Y" 比 "一般情况下做 Y" 更有效
- 降低了依从所需的认知负荷

**大语言模型具有类人性（Parahuman）：**
- 训练数据中已包含这些模式的人类文本
- 权威性语言在训练数据中通常先于依从行为出现
- 承诺序列（声明 → 行动）被频繁建模
- 社会认同模式（大家都做 X）确立了行为规范

## 伦理使用

**正当用途：**
- 确保关键实践被切实执行
- 编写高效的文档
- 预防可预见的失败

**不正当用途：**
- 为个人私利进行操纵
- 制造虚假的紧迫感
- 基于愧疚感迫使服从

**检验标准：** 如果用户完全理解该技巧，它是否仍符合其真实利益？

## 研究引用

**Cialdini, R. B. (2021).** *Influence: The Psychology of Persuasion (New and Expanded).* Harper Business.
- 七大说服原则
- 影响力研究的实证基础

**Meincke, L., Shapiro, D., Duckworth, A. L., Mollick, E., Mollick, L., & Cialdini, R. (2025).** Call Me A Jerk: Persuading AI to Comply with Objectionable Requests. University of Pennsylvania.
- 通过 N=28,000 次大语言模型对话测试了 7 项原则
- 运用说服技巧后依从率从 33% 提升至 72%
- 权威、承诺一致、稀缺最为有效
- 验证了大语言模型行为的类人性模型

## 快速参考

设计 Skill 时，请自问：

1. **属于什么类型？**（约束执行类、指导类还是参考资料类）
2. **想改变什么行为？**
3. **适用哪项原则？**（约束类通常为权威 + 承诺一致）
4. **是否叠加过多？**（不要同时使用全部七项）
5. **是否符合伦理？**（是否服务于用户的真实利益？）
