# Visual Companion Guide

Browser-based visual brainstorming companion for showing mockups, diagrams, and options, built on DSH's official document preview.

## When to Use

Decide per-question, not per-session. The test: **would the user understand this better by seeing it than reading it?**

**Use the browser preview** when the content itself is visual:

- **UI mockups** — wireframes, layouts, navigation structures, component designs
- **Architecture diagrams** — system components, data flow, relationship maps
- **Side-by-side visual comparisons** — comparing two layouts, two color schemes, two design directions
- **Design polish** — when the question is about look and feel, spacing, visual hierarchy
- **Spatial relationships** — state machines, flowcharts, entity relationships rendered as diagrams

**Use the terminal** when the content is text or tabular:

- **Requirements and scope questions** — "what does X mean?", "which features are in scope?"
- **Conceptual A/B/C choices** — picking between approaches described in words
- **Tradeoff lists** — pros/cons, comparison tables
- **Technical decisions** — API design, data modeling, architectural approach selection
- **Clarifying questions** — anything where the answer is words, not a visual preference

A question *about* a UI topic is not automatically a visual question. "What kind of wizard do you want?" is conceptual — use the terminal. "Which of these wizard layouts feels right?" is visual — use the browser preview.

## How It Works

You write HTML to a convention directory in the workspace; DSH's document preview reads and renders it. The user opens the file in the document sidebar to see it.

**Selection results are not sent back to you automatically.** The preview is an isolated iframe document and cannot deliver your user's choices to the session. So: ask the user to answer in the terminal. Never claim to have read a click inside the preview.

## Writing Files

Write every page as a self-contained HTML document. Three hard requirements:

1. **Full document.** The official preview wraps nothing and provides no ready-made CSS classes. `<div class="options">` means nothing here; nothing renders on the page.
2. **Self-contained.** Do not reference external relative CSS or scripts — relative dependencies are bundled only when interactive preview is enabled. A single file is safest.
3. **No outside-iframe capabilities.** The preview document does not share the host page context; `window.parent` gets nothing.

### Minimal example

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Layout options</title>
<style>
  body { font: 15px/1.7 system-ui, sans-serif; margin: 0; padding: 40px; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  .subtitle { margin: 0 0 32px; color: #5b616e; }
  .cards { display: flex; gap: 20px; flex-wrap: wrap; }
  .card { flex: 1 1 280px; border: 1px solid #dfe2e8; border-radius: 10px; padding: 20px; }
  .card h3 { margin: 0 0 8px; font-size: 16px; }
  .card p { margin: 0; color: #5b616e; }
</style>
</head>
<body>
  <h1>Which layout fits better?</h1>
  <p class="subtitle">Consider readability and visual hierarchy</p>
  <div class="cards">
    <div class="card">
      <h3>A Single column</h3>
      <p>Best reading experience, lowest information density</p>
    </div>
    <div class="card">
      <h3>B Two columns</h3>
      <p>Higher space utilization, needs extra style constraints</p>
    </div>
  </div>
</body>
</html>
```

In dark environments, switch colors to follow `prefers-color-scheme` or use neutral grays.

## Directory and Naming

Convention directory: `.superpowers/brainstorm/` under the project root. Delete it yourself when the session ends.

- Use semantic names: `platform.html`, `visual-style.html`, `layout.html`
- Do not reuse filenames — write a new file each iteration, `layout-v2.html`, `layout-v3.html`
- The user opens the specific file they were told about; tell them the new filename when you rewrite

If the project's `.gitignore` does not yet include `.superpowers/`, remind the user to add it.

## Loop Flow

1. **Write HTML** to the convention directory with file tools, not `cat`/heredoc (they flood the terminal).
2. **Tell the user what to expect and end the turn**:
   - Remind the file path and how to open it in the right-hand document sidebar;
   - Summarize in words what this page shows (e.g. "showing 3 layout options for the homepage");
   - Ask them to answer in the terminal, and say where.
3. **Read the user's terminal reply.** This is the only selection return channel.
4. **Iterate or move on** — if feedback changes the current page, write a new version file.
5. **Clean up when back in the terminal** — delete HTML files no longer needed, so the user does not see stale problems in the document sidebar.
6. Repeat until done.

## Per-Question Decisions

Even after the user accepts the preview, decide per question whether it is worth drawing:

- **Use preview** for visual content — mockups, wireframes, layout comparisons, architecture diagrams, side-by-side visual designs
- **Use terminal** for text content — requirement questions, conceptual choices, tradeoff lists, A/B/C/D text options, scope decisions

A question about a UI topic is not necessarily visual. "What does personality mean in this context?" is conceptual — use the terminal. "Which wizard layout feels better?" is visual — use the preview.

## Design Advice

- **Match fidelity to the question** — wireframes for layout questions, polish only for visual-fidelity questions
- **State the question on each page** — "Which looks more professional?" rather than just "pick one"
- **Iterate before pushing** — if feedback changes the page, write a new version first
- **At most 2-4 options per screen**
- **Use real content for important scenarios** — real copy and colors expose problems better than placeholder text
- **Keep mockups lean** — focus on layout and structure, not pixel perfection

## Cleanup

Delete every HTML file written this session. If a project directory was used, remind the user that the directory is in `.gitignore`.