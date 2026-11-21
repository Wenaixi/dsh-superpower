# 宿主版本兼容性（Compatibility）

## 一、本插件依赖的宿主契约

| 契约 | 由谁提供 | 用途 |
| --- | --- | --- |
| `skills.registerProvider(factory)` | `@deepseek-ai/dsh-skill` | 注册 15 个 superpowers 技能的提供者 |
| `skills/change` 事件 | 宿主 | 感知外部技能变更，精准失效内存快照 |
| `configForms.get(ns)` | `@deepseek-ai/dsh-client-ui-settings` | 读写本插件的设置页 |
| `configForms.whileServed(nss, cb)` | `@deepseek-ai/dsh-client-ui-settings` | **跨命名空间页面的正确挂载方式** |
| `slots.inject` / `slots.register` | `@deepseek-ai/dsh-client-ui-renderer` | 在 `plugins.bundle.config` 插槽注册设置卡 |
| `ctx.remote.$mount` | `@deepseek-ai/dsh-api-remotes` | 挂载 remote 面板 |

## 二、跨命名空间的面板必须用 `whileServed`（重要）

本插件的设置页会读 `locale` 命名空间的 preference（该命名空间**由别的插件拥有**）。

**错误写法**（会导致空渲染）：

```js
var localeForm = ctx.configForms.get('locale')
ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({ ... }, Panel))
```

在未组合 locale owner 的部署里，这会渲染出一个**永远空的语言选择器**——用户看到「有控件但没用」，且没有任何报错。

**正确写法**：

```js
ctx.effect(() =>
  ctx.configForms.whileServed([SETTINGS_NAMESPACE, 'locale'], () => {
    var localeForm = ctx.configForms.get('locale')
    return ctx.slots.inject('plugins.bundle.config', () =>
      ctx.slots.register({ /* ... */ }, Panel),
    )
  }),
)
```

官方契约（`dsh-client-ui-settings` 的 `ConfigForm.whileServed` 注释）：跨命名空间的页面经此挂载，**owner 不在组合里时整页不出现痕迹**——这正是期望行为，而不是显示一个失效的控件。

同时注意：`whileServed` 的 disposer 需要调用方用 `ctx.effect` 包裹；它不会自行在调用方 context 上注册。

## 三、升级宿主后的核验清单

1. `npm test` —— 26 项测试
2. `node scripts/verify.mjs` —— patch 行与元信息校验
3. `node scripts/check-skill-switches.mjs` —— 15 个技能开关与清单一致性
4. 真启动 web profile，确认无 `skipping profile bundle` / `disabling plugin`
5. 打开插件设置卡，确认技能开关与语言选择器都能正常工作

## 四、兼容声明的判定规则

宿主只读两处：`engines.dsh`（有则独占判定、peer 全旁路），否则只校验 `@deepseek-ai/dsh*` 前缀的 peer。`cordis` / `schemastery` 不参与判定。

本插件声明 `engines.dsh: ">=0.2.2-rc.1"`。

## 五、双包名分发注意

本仓库同时发布 scoped（`@wenaixi/dsh-superpower`）与无 scope（`dsh-superpower`）两个包名，产物由构建脚本替换 `@@PACKAGE_NAME@@` 占位符生成。

**宿主按安装后的包名逐字校验**客户端模块 id、RPC 命名空间与插槽 key，所以产物必须跟着包名走——硬编码会让变体包加载失败。包名只从 `package.json` 读取，不设第二处真源。
