# 可视化辅助指南

基于浏览器的可视化头脑风暴辅助工具，用于展示原型、图表和选项。

## 何时使用

按问题逐个判断，而非按会话判断。判断标准：**用户看图是否比看文字更易理解？**

**内容本身是可视化的场景，适合使用浏览器：**

- **界面原型** — 线框图、布局、导航结构、组件设计
- **架构图** — 系统组件、数据流、关系图谱
- **并排可视化对比** — 对比两种布局、两种配色方案、两种设计方向
- **设计打磨** — 问题涉及外观与质感、间距、视觉层级
- **空间关系** — 状态机、流程图、实体关系等以图形方式呈现

**内容为文本或表格的场景，适合使用终端：**

- **需求与范围问题** — “X 是什么意思？”，“哪些功能在范围内？”
- **概念性的 A/B/C 选择** — 在文字描述的方案之间做选择
- **权衡清单** — 优缺点、对比表格
- **技术决策** — API 设计、数据建模、架构方案选型
- **澄清性问题** — 任何答案是文字而非视觉偏好的问题

一个*关于*界面主题的问题并不自动等同于可视化问题。“你想要哪种向导？”是概念性问题——使用终端。“这些向导布局中哪一个更合适？”是可视化问题——使用浏览器。

## 工作原理

服务器监听目录中的 HTML 文件，并将最新的文件提供给浏览器。你将 HTML 内容写入 `screen_dir`，用户在浏览器中即可看到，并可点击选择选项。选择结果会记录到 `state_dir/events`，你在下一轮对话中读取即可。

**内容片段与完整文档：** 如果你的 HTML 文件以 `<!DOCTYPE` 或 `<html` 开头，服务器将原样提供（仅注入辅助脚本）。否则，服务器会自动将你的内容包裹到框架模板中——添加页头、CSS 主题、连接状态及所有交互基础设施。**默认编写内容片段。** 仅在需要完全控制页面时才编写完整文档。

## 启动会话

```bash
# Start AFTER the user approves the companion. --open auto-opens their browser on
# the first screen; --project-dir persists mockups and enables same-port restart.
scripts/start-server.sh --project-dir /path/to/project --open

# Returns: {"type":"server-started","port":52341,
#           "url":"http://localhost:52341/?key=ab12…",
#           "screen_dir":"/path/to/project/.superpowers/brainstorm/12345-1706000000/content",
#           "state_dir":"/path/to/project/.superpowers/brainstorm/12345-1706000000/state"}
```

保存响应中的 `screen_dir` 和 `state_dir`。使用 `--open` 时，浏览器会在你推送首屏时自动打开——你无需让用户手动打开，但仍需分享 URL 作为备用方案（无头/远程环境无法自动打开）。

**URL 中包含会话密钥（`?key=…`）。** 服务器会拒绝任何不带该密钥的请求，因此务必向用户提供 `url` 字段中的**完整** URL——不要去除查询字符串，也不要只给裸的 `http://host:port`。该密钥用于控制 HTTP 和 WebSocket 访问，防止随意的浏览器标签页或同一网络中的其他机器读取页面或注入事件。首次加载后，浏览器会通过 Cookie 记住该密钥，因此重新加载和访问 `/files/*` 资源时无需重复携带。

**查找连接信息：** 服务器会将启动时的 JSON 写入 `$STATE_DIR/server-info`。如果你在后台启动了服务器且未捕获标准输出，可读取该文件以获取 URL 和端口。使用 `--project-dir` 时，请在 `<project>/.superpowers/brainstorm/` 下查找会话目录。

**注意：** 将项目根目录作为 `--project-dir` 传入，这样原型会持久化到 `.superpowers/brainstorm/` 并在服务器重启后依然保留。若不传，文件会写入 `/tmp` 并被清理。如果 `.gitignore` 中尚未包含 `.superpowers/`，请提醒用户添加。

**按平台启动服务器：**

**Claude Code：**
```bash
# Default mode works — the script backgrounds the server itself.
scripts/start-server.sh --project-dir /path/to/project --open
```

在 Windows 上，脚本会自动检测并切换到前台模式（会阻塞工具调用）。请在 Bash 工具调用上使用 `run_in_background: true`，使服务器在对话轮次之间保持运行，然后在下一轮读取 `$STATE_DIR/server-info` 以获取 URL 和端口。

**Codex：**
```bash
# Codex reaps background processes. The script auto-detects CODEX_CI and
# switches to foreground mode. Run it normally — no extra flags needed.
scripts/start-server.sh --project-dir /path/to/project --open
```

**Gemini CLI：**
```bash
# Use --foreground and set is_background: true on your shell tool call
# so the process survives across turns
scripts/start-server.sh --project-dir /path/to/project --open --foreground
```

**Copilot CLI：**
```bash
# Start it with Copilot CLI's non-blocking/background shell mechanism so the
# server survives across turns. Keep --foreground so the harness, not the
# script, owns backgrounding. The launcher is a .sh, so invoke it via bash
# (on Windows, call Git Bash's bash.exe from the PowerShell tool).
bash scripts/start-server.sh --project-dir /path/to/project --open --foreground
```

**其他环境：** 服务器必须在后台持续运行并跨越对话轮次。如果你的环境会回收 detached 进程，请使用 `--foreground` 并通过平台提供的后台执行机制来启动命令。

如果 URL 在你的浏览器中无法访问（在远程/容器化环境中很常见），请绑定非回环地址：

```bash
scripts/start-server.sh \
  --project-dir /path/to/project \
  --host 0.0.0.0 \
  --url-host localhost
```

使用 `--url-host` 控制返回的 URL JSON 中显示的主机名。

## 循环流程

1. **检查服务器是否存活**，然后**向 `screen_dir` 写入 HTML 新文件**：
   - **必须：在引用 URL 或推送页面前确认服务器存活。** 检查 `$STATE_DIR/server-info` 是否存在且 `$STATE_DIR/server-stopped` 是否不存在。如果已关闭，请使用**相同的 `--project-dir`** 通过 `start-server.sh` 重启——它会复用同一端口，用户的已打开标签页会自动重连（服务器宕机期间会显示“已暂停”遮罩），无需发送新 URL。服务器在空闲 4 小时后自动退出（可通过 `--idle-timeout-minutes` 配置）。
   - 使用语义化文件名：`platform.html`、`visual-style.html`、`layout.html`
   - **不要复用文件名**——每个页面都使用全新文件
   - 使用你的文件创建工具——**不要使用 cat/heredoc**（会在终端产生大量噪音）
   - 服务器自动提供最新的文件

2. **告知用户预期内容并结束本轮：**
   - 提醒他们 URL（每一步都要，不只是第一步）
   - 简要文字概括屏幕内容（例如：“正在展示首页的 3 种布局方案”）
   - 请他们在终端中回应：“请查看后告诉我你的想法。如果愿意，可以点击选择一个选项。”

3. **在你的下一轮**——用户在终端回应后：
   - 如果存在，读取 `$STATE_DIR/events`——其中包含用户在浏览器中的交互（点击、选择），以 JSON 行格式记录
   - 将其与用户的终端文本合并，以获得完整信息
   - 终端消息是主要反馈；`state_dir/events` 提供结构化的交互数据

4. **迭代或推进**——如果反馈改变了当前页面，写入新文件（例如 `layout-v2.html`）。仅在当前步骤已确认后再进入下一步。

5. **回到终端时卸载**——当下一步不需要浏览器时（例如澄清问题、权衡讨论），推送一个等待页面以清除过时内容：

    ```html
    <!-- filename: waiting.html (or waiting-2.html, etc.) -->
    <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <p class="subtitle">Continuing in terminal...</p>
    </div>
    ```

    这样可避免用户在对话已推进后仍盯着已解决的选择。当下一个可视化问题出现时，像往常一样推送新的内容文件即可。

6. 重复上述流程直至完成。

## 编写内容片段

只需编写页面内部的内容。服务器会自动将其包裹到框架模板中（页头、主题 CSS、连接状态及所有交互基础设施）。

**最小示例：**

```html
<h2>Which layout works better?</h2>
<p class="subtitle">Consider readability and visual hierarchy</p>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>Single Column</h3>
      <p>Clean, focused reading experience</p>
    </div>
  </div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>Two Column</h3>
      <p>Sidebar navigation with main content</p>
    </div>
  </div>
</div>
```

就是这样。无需 `<html>`、CSS 或 `<script>` 标签。服务器会提供所有这些。

## 可用 CSS 类

框架模板为你的内容提供以下 CSS 类：

### 选项（A/B/C 选择）

```html
<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>Title</h3>
      <p>Description</p>
    </div>
  </div>
</div>
```

**多选：** 在容器上添加 `data-multiselect` 以允许用户选择多个选项。每次点击都会切换项目的选中样式。

```html
<div class="options" data-multiselect>
  <!-- same option markup — users can select/deselect multiple -->
</div>
```

### 卡片（视觉设计）

```html
<div class="cards">
  <div class="card" data-choice="design1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- mockup content --></div>
    <div class="card-body">
      <h3>Name</h3>
      <p>Description</p>
    </div>
  </div>
</div>
```

### 原型容器

```html
<div class="mockup">
  <div class="mockup-header">Preview: Dashboard Layout</div>
  <div class="mockup-body"><!-- your mockup HTML --></div>
</div>
```

### 分栏视图（并排）

```html
<div class="split">
  <div class="mockup"><!-- left --></div>
  <div class="mockup"><!-- right --></div>
</div>
```

### 优缺点

```html
<div class="pros-cons">
  <div class="pros"><h4>Pros</h4><ul><li>Benefit</li></ul></div>
  <div class="cons"><h4>Cons</h4><ul><li>Drawback</li></ul></div>
</div>
```

### 模拟元素（线框图构建块）

```html
<div class="mock-nav">Logo | Home | About | Contact</div>
<div style="display: flex;">
  <div class="mock-sidebar">Navigation</div>
  <div class="mock-content">Main content area</div>
</div>
<button class="mock-button">Action Button</button>
<input class="mock-input" placeholder="Input field">
<div class="placeholder">Placeholder area</div>
```

### 排版与区块

- `h2` — 页面标题
- `h3` — 区块标题
- `.subtitle` — 标题下方的次级文本
- `.section` — 带底部边距的内容块
- `.label` — 小号大写标签文本

## 浏览器事件格式

当用户在浏览器中点击选项时，其交互会被记录到 `$STATE_DIR/events`（每行一个 JSON 对象）。当你推送新页面时，该文件会自动清空。

```jsonl
{"type":"click","choice":"a","text":"Option A - Simple Layout","timestamp":1706000101}
{"type":"click","choice":"c","text":"Option C - Complex Grid","timestamp":1706000108}
{"type":"click","choice":"b","text":"Option B - Hybrid","timestamp":1706000115}
```

完整的事件流展示了用户的探索路径——他们在确定前可能会点击多个选项。最后一个 `choice` 事件通常是最终选择，但点击模式可能揭示犹豫或偏好，值得进一步询问。

如果 `$STATE_DIR/events` 不存在，说明用户未与浏览器交互——仅使用其终端文本即可。

## 设计建议

- **根据问题匹配保真度**——布局问题用线框图，视觉打磨问题再做精细化
- **在每页上说明问题**——“哪种布局更显专业？”而非仅仅“选一个”
- **先迭代再推进**——如果反馈改变了当前页面，先写一个新版本
- **每屏最多 2-4 个选项**
- **在重要场景使用真实内容**——例如摄影作品集应使用真实图片（Unsplash）。占位内容会掩盖设计问题。
- **保持原型简洁**——聚焦布局与结构，而非像素级完美

## 文件命名

- 使用语义化名称：`platform.html`、`visual-style.html`、`layout.html`
- 不要复用文件名——每个页面必须是新文件
- 迭代时：追加版本后缀，如 `layout-v2.html`、`layout-v3.html`
- 服务器按修改时间提供最新的文件

## 清理

```bash
scripts/stop-server.sh $SESSION_DIR
```

如果会话使用了 `--project-dir`，原型文件会保留在 `.superpowers/brainstorm/` 中以便后续查阅。仅 `/tmp` 会话在停止时会被删除。

## 参考

- 框架模板（CSS 参考）：`scripts/frame-template.html`
- 辅助脚本（客户端）：`scripts/helper.js`
