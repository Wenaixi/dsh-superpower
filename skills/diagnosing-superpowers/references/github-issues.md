# GitHub issues

`gh` 已安装并已认证时使用它；它处理认证、速率限制与 JSON。没有则退回公共 API 用 curl，再退回由你的 human partner 打开的 URL。

## 搜索

```bash
gh search issues --repo obra/superpowers --limit 10 "<terms>" \
  --json number,state,title --jq '.[] | "\(.number)\t\(.state)\t\(.title)"'
```

没有 `gh` 时（未认证，每分钟 10 个请求）：

```bash
curl -s -H "Accept: application/vnd.github+json" \
  "https://api.github.com/search/issues?q=repo:obra/superpowers+is:issue+<url-encoded terms>&per_page=10" \
  | jq -r '.items[] | "\(.number)\t\(.state)\t\(.title)"'
```

没有 curl 时，转交 `https://github.com/obra/superpowers/issues?q=<terms>`。

## 提交

把填好的 `templates/issue.md` 写入 workspace 并展示确切文本。批准后：

```bash
gh issue create --repo obra/superpowers --title "<title>" --body-file <path> \
  --label bug --label automated-issue-report
```

当报告者没有推送权限时，GitHub 会静默丢弃标签，因此标签只对协作者生效；模板脚注仍将 issue 标记为技能提交。`gh` 无法附加文件：在 issue 创建后，把 bundle 路径交给你的 human partner 通过浏览器附加。

没有 `gh` 时，转交一个基于 `diagnosis_report.md` 模板的预填链接，任何报告者都能应用两个标签：

```
https://github.com/obra/superpowers/issues/new?template=diagnosis_report.md&title=<url-encoded title>&body=<url-encoded body>
```

GitHub 拒绝超过约 8,000 字符的 URL；超过时，只发送带标题的链接，并告诉你的 human partner 从文件中粘贴正文。