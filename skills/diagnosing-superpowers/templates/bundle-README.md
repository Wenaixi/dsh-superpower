# superpowers 会话诊断 bundle

会话：<session-id>
harness：<name> <version>（<来源标签>）    superpowers：<version>（<sha 或 "not a checkout">；<来源标签>）
脱敏级别：skeleton | evidence | full
构建时间：<ISO 时间戳>

头部版本字段按 历史证据 / 未验证快照 / 当前观察 / 未知 限定。`environment.json` 对每个环境字段及其支撑位置携带同样的来源区分。

## 这是什么

一份安装过 superpowers 且出过问题的编码代理会话的脱敏记录。它让未在场的代理或人决定 superpowers 是否起作用，以及若起作用要改什么。其中报告以 `path:line` 证据说明发生了什么。按设计它不含对 superpowers 的诊断与建议修复；那是读者的工作。

## 文件

- `report.md` — 诊断报告（问题陈述、结论、环境、会话、时间线、发现、参与程度、覆盖范围说明）。
- `case.md` — 分析师们依据的 case 文件。
- `environment.json` — 环境部分的机器可读副本。
- `timeline.md` — 逐回合时间线。
- `findings/<dimension>.md` — 各维度的分析师原始发现。
- `transcripts/<session-id>.md` — 每个被检会话的逐回合压缩渲染（绝不是原始 JSONL）。工具结果正文按级别：

  | 级别 | 工具结果正文 |
  |---|---|
  | skeleton | 有意省略；替换为 `[tool result: <tool>, <bytes> bytes, exit <code>]` |
  | evidence | 被引用事件保留，包括支撑发现所需的命令与结果 |
  | full | 全部保留 |

- `scrub-log.md` — 用到的每个占位符及其类别（绝不是原始值）。

## 如何阅读

从 `report.md` §1–2 开始，然后 §7（参与程度）及其引用的证据行，再读 `transcripts/` 中对应的回合。`path:line` 引用指向报告者机器上的原始文件；同一行号在压缩 transcript 中以 `[L<n>]` 标记保留。

## 脱敏

占位符形如 `<EMAIL-1>`、`<PERSON-2>`、`<SECRET-3>`、`<HOST-4>`、`<REPO-5>`、`<ORG-6>`、`<PROPRIETARY-7>`；家目录路径改写为 `~/…`。同一占位符在本 bundle 内始终指向同一原始值。

## 生产者说明

完成后的 bundle 用实际结果替换这些说明。

脱敏后，仅用本 bundle 检查每条实质导出的发现：把其引用解析到包含的 transcript/来源标记，读取被引用的命令/结果或引文，验证它是否支撑该论断。仅有路径与行号存在并不足够。当脱敏级别或必要扣留移除了支撑时，记录具体局限。

对账 report、case、environment、findings、README 与任何本地 issue 草稿。对照最终文件（不含日志本身）刷新脱敏日志计数。移除过时的导出声明；区分 bundle 准备与归档交付。保留从历史锚点到包含证据的映射。

把独立隐私审计与证据可用性分开记录：
- 隐私审计：CLEAN 或未解决的遗漏。
- 证据支撑：受支撑或受限，注明受影响的发现与原因。

检查后内容有变，重跑受影响的检查。展示最终日志、文件清单与两项结论，供既有归档批准使用。归档已审阅文件并验证交付的归档与之匹配。在已审阅 bundle 之外记录归档交付，而不是在批准后改动其内容。脱敏不是穷尽的隐私认证。