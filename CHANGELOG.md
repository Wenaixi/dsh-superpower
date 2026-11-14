# Changelog

本项目所有值得记录的变更都记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [8.0.1] - 2026-11-14

### Changed

- `hostLanguage()` 抽成纯函数 `hostLanguageFrom(ctx)`。原实现用一个 `try` 包住 `ctx.get('settings')?.describe()`，把「服务不存在」（设计上的正常回退）与「describe() 自身崩溃」（真 bug）吞并成同一个 `undefined`。现在先判断服务与 `describe` 是否存在，`catch` 只保护调用本身。

### Fixed

- 删除构造函数里从未读写的两个字段 `_lastRawSnapshot` 与 `_lastKeyword`。

## [8.0.0] - 2026-10-17

### Changed

- 全面适配 DSH v0.2.1-rc.2：在 `package.json` 声明 `engines.dsh: >=0.2.0-rc.2 <0.3.0-0`，服从官方「第三方插件版本兼容性优先按 engines.dsh 判断」的新规范，拒绝旧版本。
- 核心依赖对齐 0.2.1-rc.2：`@deepseek-ai/cordis` 升至 4.0.5、`@deepseek-ai/schemastery` 升至 3.18.5、`@deepseek-ai/dsh-skill` 升至 0.2.1-rc.2。
- 技能契约对齐最新 `SkillCandidate` 与 `SkillDefinition` 规范：`SkillDocument` 与 `SkillCatalog` 提供 `resourceBase` 相对资源基准、`source: 'bundled'` 来源标记、`whenToUse` 路由引导与 `invocation` 控制策略；全链路透传 `AbortSignal`，异常捕获块优先识别并重抛 `AbortError`。
- 单开关切换操作从 3 条压缩为 1 条，批量控制压缩为纯 15 条原子操作，杜绝宿主 `revision` 乐观锁冲突与状态撕裂。

### Removed

- 移除废弃的历史双轨表 `modelDisabled` 与 `userDisabled`，配置结构收敛为单一 `disabled` 字典与三态 `language`。
- 移除 `SwitchPanelModel` 中的 `LEGACY_FIELDS`、`legacyActive` 与单开关操作时的 `legacyCarry` 继承逻辑。
- 移除每次写入尾部追加旧表 `unset` 的冗余操作。
- 配置中存在历史旧表时不再读取、不再继承。

## [7.7.2] - 2026-10-11

### Fixed

- 修复客户端 `useSyncExternalStore` 引用不稳定导致的界面卡死：前端控制器 `SwitchPanelModel` 引入事件驱动快照缓存，未发生状态跃迁时 `getSnapshot()` 返回严格恒等的对象引用，消除 React 18 判定外部存储变动而陷入的无限递归重渲染死循环；`updateScope` 补齐恒等守卫，禁止在 render 周期内无条件派发同步更新；组件顶层添加表单属性解构防空保护。
- 修复 Schemastery 跨端 `Schema.transform` 序列化硬伤导致配置通道不可用：`disabled` 与 `language` 还原为跨端原生的 `Schema.any().default(...).volatile()` 声明，解决 `schema.toJSON()` 丢失函数回调导致浏览器客户端校验抛出 `TypeError: callback is not a function` 的问题，配置表单恢复挂载。

## [7.7.1] - 2026-10-10

### Fixed

- 修复取消信号被误吞的脏状态漏洞：`src/catalog.ts` 的目录扫描循环与 `getDefinition` 补齐中止守卫并立即重抛，取消信号不再被当成「文档解析失败」记入错误列表或静默返回 `undefined`。
- 客户端构建改为先验后写：先校验技能清单漂移，零漂移才写入磁盘产物，再核验落地，杜绝源码清单漂移导致磁盘产物被提前脏覆盖。
- 解耦未直接消费的 import，重导出委托给 `export ... from`；`tsconfig.json` 开启 `noUnusedLocals` 与 `noUnusedParameters`，消除死代码。

## [7.7.0] - 2026-10-08

### Changed

- 客户端重构为深模块 `SwitchPanelModel`：将分散的 8 参 `submit` 函数、单批原子 ops 构造、旧表继承、`disposed` 守卫与错误堆栈输出收进深模块类，React 组件经 `React.useSyncExternalStore` 一行接入，蜕变为纯渲染器。
- 批量操作改为单次原子批处理：「全部开启」「全部关闭」「恢复默认」从 15 次并发写入重构为单次原子批处理。
- 语言切换升级为三段式选择器：中文、英文、跟随宿主自动；未配置时高亮跟随宿主并显示当前跟随的宿主界面语言，显式选择时锁定，选择跟随宿主时写 `unset` 清除锁定。
- 强化斜杠唤出与模型可见作用域说明：选择器上方新增独立标题说明仅切换「/」唤出时展示的技能介绍，技能正文保持英文原版不变。
- 移除面板中的元信息行 `spSwMeta`，配置面板更清爽。
- `package.json` 与 GitHub 仓库统一标准中英双语简介；`locale/zh.json` 与 `locale/en.json` 严格分立呈现。
- SkillCatalog 语言切换复用已解析的内存条目生成新快照，消除重复的磁盘 Markdown I/O。
- git 忽略补齐：新增编辑器残留、本地私有配置、Playwright 产物、`reports/` 以及 `undefined/`、`.local/` 兜底防复发。

### Fixed

- 修复 Windows 沙箱管道 EPERM 崩溃：契约检查改用 Node 原生 `node:vm` 纯内存编译解析，替代跨进程 `spawnSync`，不再触碰命名管道，免疫沙箱权限拦截。
- 修复冷读取语言丢失：`getDefinition` 自愈冷重读时透传归一化 `language` 参数，冷读与热读双语表现一致。
- 修复宿主语言缺省态缓存穿透：引入 `hostLanguageResolved` 布尔标志，消除 `undefined` 缺省态下每轮重复全量反射扫描 `settings.describe()` 的性能损耗。
- 修复取消信号吞没：`isDirModified` 优先重抛 `AbortError`。
- 消灭客户端静默失败：`submit` 错误处理分支补齐原生堆栈输出与控制台标记。
- 客户端 HMR 样式热更新覆盖：样式单例注入改为存在则更新 `textContent`、不存在才 `appendChild`。
- 修复浏览器端未配置态语言语义折叠：`readLanguage()` 缺项时保留 `undefined`，此前折叠为 `'zh'` 导致面板无法表达跟随宿主且与宿主侧三态撕裂。
- 宿主语言变更实时生效：Host 侧监听 `app-boot/config-reload` 事件，配置补丁应用后即时让目录与语言缓存失效并重扫。
- 修复客户端历史禁言表原子迁移：单技能开关操作时原子性将历史禁用项迁移写入新表 `disabled`，避免单次开关把历史禁用项误清空。
- SkillCatalog 增加并发重入屏障：合并并发重入扫描，杜绝并发查询时目录被反复清空导致的假重名与技能丢失。
- 补全 npm 发布白名单：`files` 数组补入 `README.zh.md`，修复发布后中文说明 404。
- 文档事实错误修正：README 删除不存在的 `dsh-tools.en.md` 引用、明确语言切换只改技能描述、两份 README 的版本沿革合并为一处指向 CHANGELOG 的入口；CONTEXT.md 修掉畸形列表、撞号与包体积旧口径；CONTRIBUTING.md 修掉过时口径与坏命令。

### Removed

- 移除 `docs/` 历史计划目录。
- 删除根目录 12 个历史 `*.tgz`、`undefined/temp/`、`.verify-shots/`、`.cache-repos/` 与已完工的 `.superpowers/` 账本，累计释放超过 56 MB。
- 移除 `SkillCatalog` 中从未被读取的死属性 `entriesByDir`、空展开、孤立未引用的 `optionalString` 函数与冗余的 `VolatileRef` 接口。
- 契约模块删除重构残留的孤儿注释与误留的重复校验实现。

### Changed

- README 保留上游开源项目链接引用，去除个人作者与协议声明，并追加对 `dsh-plugin-dev` 权威技能库的致谢。
- `dsh-tools.md` 工具映射按 DSH 0.2.0-rc.2 桌面版源码与运行时实测重写，修正文件观察策略、web 工具独立存在、workflow 工具需装配、ralph 默认禁用、cordis 工具只读检查等事实错误，并新增 41 个实测工具的完整目录、PTC/native 呈现模式、后台作业、装配三层模型。
- `using-superpowers` 的 Platform Adaptation 段同步：Task/Subagent 改为 subagent/subagent_fork，去掉对 workflow 的默认存在承诺。

## [7.5.8] - 2026-10-06

### Fixed

- 消灭语言切换静默失败：顶部语言栏增加对语言切换失败状态的显式渲染与控制台告警，底层写入失败、被拒或超时时红字实时告警，不再静默吞掉报错。
- 修复热更新表单失效假死：`submit` 回调输出明确控制台日志。

## [7.5.7] - 2026-10-06

### Fixed

- 修复 7.5.6 面板版本号显示错误：面板 meta 显示的版本号与包版本不一致，版本升至 7.5.7。
- 语言按钮增加可见说明文字，「仅切换技能描述，技能正文保持英文原版」，不只依赖 tooltip。

## [7.5.6] - 2026-10-06

### Changed

- 回退 7.5.5 的面板文案随语言切换：语言按钮只控制技能描述与按钮自身的显示语言，面板其余 UI 恢复跟随宿主界面语言。

## [7.5.5] - 2026-10-06

### Fixed

- 面板 UI 文案未随语言按钮生效：此前点击语言按钮只切换技能描述，面板自身的 UI 文案不变，看上去像没反应；改为面板内所有文案跟随语言按钮的生效语言。

## [7.5.4] - 2026-10-06

### Changed

- 7.5.3 发布时 npm 出现 staged-publish 冲突，两次并发发布同一版本导致元数据未落库，改用 7.5.4 重发，代码内容与 7.5.3 相同。

## [7.5.3] - 2026-10-06

### Fixed

- 修复语言按钮显示逻辑：按钮文案改用生效语言，而非原始偏好值。此前 `language` 未落盘时按钮错误显示「中文」，点击后永远显示「中文」，看起来像「点 English 无效」。

## [7.5.2] - 2026-10-06

### Changed

- 语言切换单按钮化：面板每行由「中文 / English」双按钮改为单个按钮，显示目标语言。
- 描述默认跟随宿主语言：`language` 字段缺失时技能描述语言跟随 DSH 宿主界面语言，宿主切语言描述跟着变；面板调过后固定为该语言。
- 语言按钮上移面板顶部，一次切换全部 15 个技能的描述语言。

## [7.5.1] - 2026-10-06

### Changed

- 技能正文统一为上游英文原版：每个技能单份 `SKILL.md`，frontmatter 同时声明英文 `description` 与中文 `description_zh`；删除全部 52 个 `SKILL.en.md` 与辅助 `.en.md`，文档链接改回 `.md`。
- 语言偏好只切换描述：`language` 偏好决定 `ctx.skills.list()` 与 `get()` 返回英文还是中文描述，正文恒为英文；面板「中文 / English」按钮同步更新。

## [7.5.0] - 2026-10-06

### Added

- 每个技能新增英文正文：`skills/<name>/SKILL.en.md` 以 obra/superpowers v6.4.2 英文原版为底稿做 DSH 专属化清理，与中文 `SKILL.md` 并存。
- 面板语言切换：每行新增「中文 / English」按钮，全局单一偏好 `language` volatile 字段，切换即改该技能的显示语言与模型加载正文语言；英文描述一律以 `Superpower Skill:` 开头。
- README 双语：README.md 改为默认英文，中文版移入 README.zh.md，两份文档顶部互跳。

### Changed

- 模型侧随语言偏好供电：`language` 偏好同时决定技能目录的 description 与模型加载正文的 content，`loader/volatile-update` 事件热刷新。

## [7.4.1] - 2026-10-06

### Fixed

- 修复面板每次开关操作都报「保存失败」、配置零写入的问题：`dsh-settings` 的写入闸门逐条校验操作路径是否落在 volatile 节点下，7.4.0 把两个旧字段去掉 `.volatile()` 后它们变成非 volatile 节点，整批写入里只要有一条 `unset` 指向旧字段就被整批拒绝；恢复两个旧字段的 `.volatile()` 声明后，`unset` 可以合法清掉旧字段。
- 面板 meta 区补「面板版本」标注：浏览器侧读不到 `package.json`，界面是判断安装版本的唯一现场，写死常量并在页头显示。

## [7.4.0] - 2026-10-05

### Removed

- 移除 brainstorming 随包可视化服务：`skills/brainstorming/scripts/` 整目录删除，含服务端、启动与辅助脚本与模板。宿主 `documentPreviews` 已内置 html 与 htm 预览并渲染为隔离 iframe，插件无需自建端口；预览中的点击不再回传给 agent，选择结果必须回到终端回复里，`visual-companion.md` 与 `SKILL.md` 均显式写明这一约束。
- 配置字段 `modelDisabled` 与 `userDisabled` 废弃：两者去掉 `volatile()` 后不再可写，面板只写 `disabled`；schema 声明保留，否则 profile 里的旧键会被直接丢弃；`readSwitches` 在 `disabled` 为空时取两旧表的并集，保证升级前的开关在用户第一次操作前继续生效。手动改过 `cordis.patch.yml` 的用户需要把值并入 `disabled`。

### Changed

- 每个技能从两个开关合并为一个：原先「模型可调用 / 用户可调用」两个语义重叠的开关合并为单个开关，关闭即两侧同时为 false；面板行布局改为标签在左、单开关在右；词条与提示合并。
- 开关状态收敛到单张禁言表：新增 `disabled` volatile 字典作为唯一写入目标，主写入与两条清理旧表的 `unset` 合进同一次 `mutate`，共享一个 revision 栅栏与一次持久化决策，不存在半迁移态。
- 修复客户端构建死锁：构建脚本原先在复制产物之前校验且把「src 与 lib 内容一致」也作为失败条件，产物一旦落后于源就永远无法重建；改为先复制再校验。

## [7.3.0] - 2026-10-04

### Fixed

- 修复技能快照对内容编辑失明导致长驻实例返回过期目录：快照复用判据从单一目录 mtime 升级为三键聚合指纹，目录 mtime、根级技能目录名集合、各 `SKILL.md` 的 mtime，任一变化即重扫；稳定场景仍只做一次 stat 与一次 readdir，不读文件内容。
- 修复裸调用守卫正则分支只匹配字母与连字符、真实 kebab 技能名全部逃逸的问题，两处正则统一为完整 kebab 形态。
- 修复客户端清单比对按索引比对隐含顺序一致假设的问题，改为按技能名建 Map 比对，只报真实内容差异。
- 修复手写括号配平器字符串分支错误导致配平失效的问题，改朴素边界加求值双保险。
- 修复聚合完整性校验漏判缺失技能：目录在而 `SKILL.md` 缺失时此前计入成功，现计入失败。

### Changed

- 技能总数魔法数收敛：`15` 导出为 `EXPECTED_SKILL_COUNT` 常量，新增或删除技能只改一处。
- `required` 存在性清单清理：删除恒真项与已被覆盖的技能路径，17 项收敛到 11 项。
- frontmatter 边界契约注释钉死：多 YAML 文档与 CRLF 单字符剥除的边界显式写入注释。
- review-sync 返回契约统一：移除数值型历史兼容分支，统一返回 `{ ok }`，总线只判 ok 定退出码。

## [7.2.1] - 2026-10-04

### Fixed

- 面板底部三个标注切语言不变：`provider`、`rank`、`source` 三个标签此前硬编码英文，宿主界面语言切到中文时仍是英文；并入中英词典，经官方 locale 注册表取词，随界面语言整体切换。

### Changed

- 固化面板语言边界：技能内容固定中文，不做技能级 i18n；面板 UI 文案全部双语。locale 文件与面板词典是两个独立通道，不合并。

## [7.2.0] - 2026-10-03

### Added

- 技能开关面板：DSH Web GUI 插件管理页里 `@wenaixi/dsh-superpower` 卡片的详情页，本包 15 个技能各有两个开关。关掉模型侧，技能不再进入模型可用目录，`skill` 工具调用被拒；关掉用户侧，不再出现在斜杠命令补全与命令行技能清单。面板另有全部开启、全部关闭、恢复默认三个批量操作，按名称或描述过滤的搜索框，以及 `provider`、`rank`、`source` 三个只读标注供排查同名覆盖。配色、字阶、圆角全部取自 DSH 语义令牌，深浅色随 `body[data-ds-dark-theme]` 自动切换。
- 本包升级为双面插件：新增 `src/client.js` 经构建脚本复制到 `lib/client.js`、`exports["./client"]` 与 `dsh.client` 声明；纯终端 profile 不加载浏览器半侧，宿主侧行为不变。
- 新增图标与插件卡片元数据：`icon.png` 肌肉手臂实心剪影，浅色深色底都可读；新增 `locale/en.json` 与 `locale/zh.json` 提供卡片标题与描述的中英文本；`exports` 放行 `./package.json` 与 `./locale/*.json`，否则卡片只剩包名，宿主读取插件元数据时把错误吞进 `meta.error`，安装与启动日志都看不到。
- 技能开关状态深模块 `src/switches.ts`：封装两个以技能名为键的禁言表的 volatile 解包与 `SkillInvocationPolicy` 覆盖。
- 开关状态落进 profile 配置：`Config` 新增 `modelDisabled` 与 `userDisabled` 两个 volatile 字典字段，写入 profile 的 `cordis.patch.yml`；开关经官方 `ctx.configForms` 通道读写，带乐观并发栅栏；宿主收到 `loader/volatile-update` 后刷新注册表缓存并广播 `skills/change`。技能仍保留在注册表中并继续占同名裁决权。

### Fixed

- 修复面板样式从未注入 DOM 的问题：`src/client.js` 中定义了 CSS 常量与类名，却没有任何代码把样式塞进页面，面板渲染成浏览器默认样式且不报错；现按官方契约注入 `style[data-plugin-css]` 标签，宿主卸载插件时一并回收。
- 修复三个批量按钮只作用于单侧的问题：「全部关闭」只写模型侧、「恢复默认」只清用户侧，与按钮文案承诺的「两侧」不符；「恢复默认」清的是本来就空的一侧，用户侧残值原样留着且 UI 上无法区分，只能翻配置文件发现；三个按钮统一作用于两侧。顺带修复 `submit()` 字段参数形态不一致导致批量路径静默失效的问题。

### Changed

- `@deepseek-ai/schemastery` 的 peer 与 dev 约束提升至 `^3.18.4`，该版本的类型声明包含 `.volatile()`。
- 新增开发依赖 `@deepseek-ai/cosmokit`，供端到端实录脚本按宿主同构方式构造与更新 volatile 引用。
- README 重写：去掉自述性说明与重复表述，命令块保持原样可复制，新增「卡片标题描述图标为空」的排查条目。

## [7.1.1] - 2026-10-02

### Fixed

- 修复同名优先级实测脚本在 pnpm isolated 布局下无法定位官方 provider：脚本原先只在 profile 的 `node_modules` 下查找官方文件系统技能包，而该包只存在于 dsh 安装本体的依赖树中；改为三级候选路径加兜底扫描，查找失败时列出全部已尝试路径，并指引改用自研桩对照脚本。

## [7.1.0] - 2026-10-02

### Added

- 提炼 `SkillCatalog` 深模块 `src/catalog.ts`：封装技能目录扫描、mtime 变更探测、不可变快照复用、热重读自愈回写与名称漂移校验，对外只暴露目录、定义与规范校验三个接口。
- 提炼 `SkillDocument` 深模块 `src/document.ts`：封装 BOM 消除、CRLF 归一化、YAML frontmatter 解析、调用策略校验与契约转换。
- 提炼 `SkillPriorityHarness` 测试基座，统一编排真实 Cordis 上下文隔离、正反顺序注册与胜出判定，两个同名裁决校验脚本精简超 40% 样板代码。
- 收敛上游同步复核为统一命令行总线 `scripts/review-sync.mjs`：三个碎片脚本转为轻量代理，一键双绿。
- 边界自检下沉至模块自身，校验脚本退化为纯声明式调度器。
- 全仓 10 个伴生脚本纳入 Shebang 与 LF 行尾的跨平台检查。

### Fixed

- 发布流水线幂等保护：tag 重推或 workflow 重跑时，命中已发布版本即跳过发布，避免假红；显式指定官方 npm registry，修掉 runner 镜像覆盖导致静默发布失败的问题。

## [7.0.1] - 2026-10-02

### Fixed

- 重新发布干净 tarball：`v7.0.0` tag 早于平台专属化改造，其 npm 包仍携带非 DSH 平台的参考文档；本版为专属化落地后的干净产物，升 patch 重发；`7.0.0` 因 npm 禁止卸载保留在 registry，已标注废弃，官方源 `latest` 已指向 7.0.1。

### Removed

- 平台专属化：仅支持 DSH，移除全部非 DSH 平台的参考文档与兼容层。删除 `using-superpowers/references/` 下 7 个非 DSH 工具映射文件、`anthropic-best-practices.md` 与 `writing-skills/examples/CLAUDE_MD_TESTING.md`；技能正文的平台适配小节固化为 DSH 原生工具规范；随包脚本移除外部平台探测分支；上游同步复核同步专属化，不再因缺失报错。
- 技能名与目录去掉 `superpower-` 前缀：14 个技能回归上游原名，`frontmatter.name`、目录名、全部正文引用同步更新；旧名 `skill("superpower-writing-plans")` 不再可用，改用 `skill("writing-plans")`。
- 全文符号清除：全部 15 个技能正文与辅助文档中的图形状态符号替换为 ASCII 标记，文档不再包含任何 emoji；核心专业术语回英文原词，句子仍为简体中文。

### Changed

- 同名技能优先级反转：官方注册表同层重名按 rank 从低到高裁决，本包优先级由 550 改为 10，低于官方项目与用户根和内置 bundled，任何与本包同名的本地技能或官方技能均不会覆盖本包。
- frontmatter `description` 统一加 `Superpower Skill：` 前缀标明技能来源。
- 同步上游 v6.4.2 内容：新增 `diagnosing-superpowers` 技能；`writing-plans` 改写为记录决策而非代码转写；`executing-plans` 重建为 Native 执行模式并配套新增脚本；`brainstorming` 先澄清需求再提方案；`requesting-code-review` 的 BASE_SHA 改用 `git merge-base`，reviewer 按「合理用户预期」判断规格未提及行为；`test-driven-development` 的 green 定义改为项目自己的全套测试命令；`subagent-driven-development` 同名 plan 独立工作区并支持控制器嵌套；`using-superpowers` 新增两个外部平台的工具映射参考。
- 依赖升级：`@deepseek-ai/dsh-skill` 升到 0.2.0-rc.2，`@deepseek-ai/cordis` 固定 4.0.4；peer 范围改为 `>=0.1.0-rc.1 <0.3.0-0`，DSH 0.2.0 系安装不再需要版本豁免。
- 修订历史变更记录中 peer 范围实测版本的过时陈述。

## [6.3.1] - 2026-08-23

### Changed

- 脱离上游独立演进：本仓库从 `-dsh.N` 预发布线转为正式版本线，首个正式版 v6.3.1；上游基准锁定 v6.3.0，后续同步上游变更时以 cherry-pick 方式合入并记录。

### Fixed

- 修正技能名引用与文档一致性：README 技能表补全技能名；外部平台与 DSH 工具映射文件的技能名统一加 `superpower-` 前缀；正文与流程图技能名引用带前缀；声明台词与注释中文化；目录名同步策略更新为 dsh.9 后口径并移除 AI 味尾句；CHANGELOG 补 release 链接；发布流水线 dist-tag 正则去基线硬编码。

## [6.3.0-dsh.10] - 2026-08-23

### Fixed

- `@deepseek-ai/dsh-skill` peer 范围改为显式预发布分支：原 `^0.1.1-rc.2` 只会放行一个版本，既有预发布构建会被静默排除，用户安装时触发解析冲突；改为覆盖全系列预发布与正式版的写法。

## [6.3.0-dsh.9] - 2026-08-23

### Changed

- 把 `skills/` 目录硬重命名为 `superpower-` 前缀：此前仅改了 frontmatter.name，目录仍为原 kebab，依赖 Provider 的「frontmatter 优先于目录名并 warn」逻辑；本次让目录名与 frontmatter.name 完全一致，消除列表警告与名称漂移校验风险，确保 `skill("superpower-writing-plans")` 等调用在启动快照与 HMR 缓存下稳定命中；同步更新残留的旧路径引用。

## [6.3.0-dsh.8] - 2026-08-23

### Fixed

- `cordis.patch.yml` 包名加引号：未加引号时 `dsh --dump-config` 报 YAML 缩进错误，因为 `@` 开头在 YAML plain scalar 中不合法；改为加引号，与其他插件保持一致。

## [6.3.0-dsh.7] - 2026-08-23

### Changed

- npm 包名统一为 `@wenaixi/dsh-superpower`：与同组其他插件保持一致的 scope。变更 `package.json#name`、新增 `publishConfig: { access: "public" }`，`cordis.patch.yml` 的 name 同步，README、发布流水线、源码注释与文档全量替换为 scoped 名。GitHub 仓库名不变。
- 旧名 `dsh-superpower` 废弃：发版后执行 `npm deprecate` 标注迁移，后续不再向该名发布新版本。

## [6.3.0-dsh.6] - 2026-08-22

### Fixed

- 修复 npm `latest` dist-tag 站位问题：当旧基础版被卸载后，npm 的「没有 latest 时回退到最高 semver 版本」默认行为会让最新发的预发布版抢占 `latest`；发布流水线在发布到 npm 之后新增「为 `-dsh.N` 系列打 `dsh` dist-tag」步骤，把 dsh 系列从 latest 抽离。

### Changed

- `CLAUDE.md` 新增「dist-tag 策略」节：明确 `-dsh.N` 系列为事实稳定演进线、显式打 dsh tag 与 npm 默认 latest 抢占的应对、发布流水线对应变更说明。

## [6.3.0-dsh.5] - 2026-08-22

### Changed

- 14 个技能统一加 `superpower-` 前缀，与上游 `obra/superpowers` 永久脱钩：`frontmatter.name` 由原 kebab 改为 `superpower-<kebab>`，目录名保持不变，Provider 不动；用户命令与模型调用均使用新名；上游同步策略写入 CONTRIBUTING 新增节。
- 从升级后所有调用方式都必须更新，旧名不再注册，`ctx.skills.get("brainstorming")` 返回 `undefined`。
- `dsh-tools.md` 与其余 references、README 技能清单中的示例同步改为 `superpower-<name>` 命名。

### Removed

- 移除上一版未发布时尝试的「28 条别名 candidate」方案：DSH 上游技能名规则拒绝冒号，前缀方案只能走 kebab-case 短横线。

## [6.3.0-dsh.4] - 2026-08-22

### Fixed

- 修复发布流水线中 CHANGELOG 提取正则的非法锚点：`\z` 在 JS 中退化为字面量，含字母 z 的末版正文被截断；改为定位标题行后手动切片到下一个版本标题，输出路径改为临时目录避免并发覆盖。
- 健壮性修正：frontmatter 解析去 BOM；目录列表的读取透传 `AbortSignal` 及时中断；技能正文读取补定位守卫、透传信号、中止错误直抛、非缺失错误记警告，并补全 frontmatter、名称漂移、调用策略非法的诊断。

## [6.3.0-dsh.3] - 2026-08-22

### Changed

- 复用 `dsh-skill` 官方技能名校验，移除本地正则；`providerName` 改为必填并拒绝保留名 `runtime`。
- `list` 与 `get` 尊重调用方的 `AbortSignal` 并及时抛出；重复技能名去重并告警；文件缺失记为调试信息、YAML 解析失败独立告警；解析函数不再静默吞错；移除 `import.meta.url` 静默降级，改为显式失败。
- `apply` 改用单一 `ctx.effect` 包裹 Provider 注册与技能变更监听，卸载时按序清理，HMR 无残留。
- `package.json` 新增 `prepare` 脚本，修复从 GitHub 直装时无构建产物的坑。

## [6.3.0-dsh.2] - 2026-08-22

### Changed

- README 安装示例默认主工作台由 demo 改为 web，并注明自动走 `dsh.bundle`、无需手动配置 `cordis.patch.yml`。

## [6.3.0-dsh.1] - 2026-08-22

### Fixed

- 修正 README 中「还没发布到 npm」等过时描述，改为 A、B、C、D 四路径安装说明。
- 因 npm 不允许同版本覆盖，后续文档等非功能修正改用 `-dsh.N` 预发布后缀递增。

## [6.3.0-dsh.0] - 2026-08-12

### Added

- 同步上游 v6.3.0 初始移植：新增 Devin CLI、Hermes Agent、Grok Build CLI 安装说明；brainstorming 仪式随任务分级；subagent-driven-development 控制器不再因非灾难性分歧阻塞、冲突预检写入账本、同构小任务批量派发、实现者与 reviewer 禁止再派生子 subagent、计划携带规格指针；分支收尾遇未提交内容时列出文件并询问；修复上游脚本 Windows 兼容问题。
- DSH 移植：插件入口实现 `SkillProvider`，`rank 550`，`providerName: superpowers`，技能目录可配置；14 个技能及 20 余辅助文档完整中文化，frontmatter.name 保持英文、description 译为简体中文，代码命令与路径不译。
- 新增 `skills/using-superpowers/references/dsh-tools.md`：外部平台工具到 DSH 的映射表。
- 声明 `dsh.bundle.patch`，`cordis.patch.yml` 单行挂载。

## 更早版本

上游 `v6.2.0` / `v6.1.x` / `v6.0.x` 等变更见上游仓库 Release Notes。上游 `package.json#version` 变更时，本仓库同步 bump。

[7.7.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.7.0
[7.5.8]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.8
[7.5.7]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.7
[7.5.6]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.6
[7.5.5]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.5
[7.5.4]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.4
[7.5.3]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.3
[7.5.2]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.2
[7.5.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.1
[7.5.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.5.0
[7.4.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.4.1
[7.4.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.4.0
[7.3.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.3.0
[7.2.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.2.1
[7.2.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.2.0
[7.1.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.1.1
[7.1.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.1.0
[7.0.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v7.0.1
[6.3.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.1
[6.3.0-dsh.10]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.10
[6.3.0-dsh.9]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.9
[6.3.0-dsh.8]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.8
[6.3.0-dsh.7]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.7
[6.3.0-dsh.6]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.6
[6.3.0-dsh.5]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.5
[6.3.0-dsh.4]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.4
[6.3.0-dsh.3]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.3
[6.3.0-dsh.2]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.2
[6.3.0-dsh.1]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.1
[6.3.0-dsh.0]: https://github.com/Wenaixi/dsh-superpower/releases/tag/v6.3.0-dsh.0