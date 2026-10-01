# re-review prompt 模板

在派发修复轮次后的复审时使用此模板。re-reviewer 负责核实上一轮的问题是否已修复，并检查修复 diff 是否引入新的破坏性变更。这不是一次全新的评审——完整评审已经完成。

**用途：** 逐条核实上一轮评审中的问题是否已处理，并确认修复本身没有引入新的问题。

```
Subagent (general-purpose):
  description: "重新评审任务 N 的修复轮次 R"
  model: [MODEL — 必填：按 SKILL.md 的模型选择规则选择；若省略则静默继承会话中最昂贵的模型]
  prompt: |
    你正在复审单个任务的某一轮修复。上一轮评审已产生若干 finding；实现者已尝试修复它们。你的职责仅是对每一条 finding 给出裁决，并检查修复 diff——除此之外不做其他事。

    ## 任务

    阅读 task brief：[BRIEF_FILE]

    ## 待核实的问题

    [FINDINGS]

    ## 修复内容

    阅读实现者的报告（修复报告追加在末尾）：
    [REPORT_FILE]

    **修复基线：** [FIX_BASE_SHA]（上一轮评审所见的 head）
    **当前 Head：** [HEAD_SHA]
    **Diff 文件：** [DIFF_FILE]

    仅阅读一次 diff 文件——其中包含修复提交、统计摘要以及带上下文的修复 diff。不要重复执行 git 命令。
    若 diff 文件缺失，请自行获取 diff：
    `git diff --stat [FIX_BASE_SHA]..[HEAD_SHA]` 和
    `git diff [FIX_BASE_SHA]..[HEAD_SHA]`。

    本次检出上的评审为只读。不得以任何方式改动 working tree、暂存区、HEAD 或分支状态。

    ## 你不得分发 subagent

    自行完成全部评审。不得衍生 subagent 来分担 diff 的部分评审，也不得另起 reviewer 寻求二次意见。
    本流程已提供了该工作所需的所有评审席位；你衍生的 reviewer 是对其中一个席位的重复，会产生全量成本，且其裁决不作数。若 diff 过大难以一遍看完，请自行分多遍评审，并在报告中说明。

    ## 范围

    你的范围仅限于 finding 列表和修复 diff。逐条裁决每一条 finding，并检查修复 diff 是否引入了由修复本身导致的新问题。不要重新评审修复未触及的代码：若你注意到完全在修复 diff 之外的问题，请归入“范围外观察”上报——它不会阻塞本任务，也不会延长循环。所有任务完成后再进行一次全分支的广度评审。

    ## 测试

    实现者已重新运行覆盖受改代码的测试，并将结果追加到报告文件中。将报告视为未经核实的陈述：
    确认修复报告中已列出覆盖性测试并展示其输出，并对照 diff 核实其声明。不要为验证其报告而重新运行整个测试套件。仅当阅读代码产生了现有运行结果无法解答的具体疑虑时，才运行测试——且只运行聚焦的单项测试，绝不要运行包级别的全量套件。

    ## 输出格式

    你的最终消息即为报告本身：直接从第一条 finding 的裁决开始。每一行都是一条裁决、一条带 file:line 的 finding，或你执行过的某项检查——不要写前言，不要叙述过程。

    ### finding 裁决

    按“待核实的问题”中的顺序逐条处理：
    - **[finding 一句话摘要]** — ADDRESSED | NOT ADDRESSED，并附 file:line 证据。“已尝试”不算已处理：具体缺陷必须已不存在。

    ### 修复 diff 中的新增破坏

    修复本身破坏或引入的任何问题，需标注严重级别（Critical/Important/Minor）及 file:line。若无则写“None”。

    ### 范围外观察

    完全在修复 diff 之外注意到的问题。非阻塞；由控制器记入 ledger 供最终评审使用。若无则写“None”。

    ### 裁决

    **修复轮次：** [所有 finding 已处理且无新增 Critical/Important 级破坏 | 仍有未关闭 finding] —— 列出未关闭项。
```

**占位符说明：**
- `[MODEL]` — 必填：按 SKILL.md 的模型选择规则选择评审模型；针对小范围修复 diff 的定点复审选用廉价至中等层级即可
- `[BRIEF_FILE]` — task brief 文件（与实现者所依据的文件为同一份）
- `[FINDINGS]` — 上一轮评审中的 Critical/Important 级 finding 及规格缺口，逐字复制，每条一个 bullet
- `[REPORT_FILE]` — 实现者的报告文件（修复报告会追加在末尾）
- `[FIX_BASE_SHA]` — 上一轮评审所见的 head
- `[HEAD_SHA]` — 当前提交
- `[DIFF_FILE]` — 执行 `bash scripts/review-package PLAN_FILE FIX_BASE HEAD` 时打印的路径

**re-reviewer 返回：** 逐条 finding 的裁决（ADDRESSED / NOT ADDRESSED）、修复 diff 中的新增破坏、范围外观察，以及本轮裁决。