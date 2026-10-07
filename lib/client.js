/**
 * @wenaixi/dsh-superpower — 浏览器半侧：技能开关面板
 *
 * 本文件是手写的 CJS factory 源，由 scripts/build-client.mjs 原样复制到 lib/client.js。
 * 不经 tsc 编译：DSH 客户端要求工厂形态的同步导出，tsc 无法产出；且一旦存在两个产物
 * 来源，两份产物必然漂移，且漂移时机取决于构建顺序。
 *
 * 面板落在插件管理页中本包卡片的详情页（plugins.bundle.config 插槽，key 为包名）。
 * 这是官方注册的插槽，无需自建页面或端口：宿主渲染该插槽时自带 ConfigForm 数据面。
 * 开关状态经官方 configForms 通道读写：ctx.configForms.get('superpowers') 返回的
 * ConfigForm 与本包 Config 的 volatile 字段一一对应，mutate 落盘到 profile 的
 * cordis.patch.yml，热生效且带乐观并发栅栏。
 *
 * 注意：bundle 详情页渲染本插槽时不传 owner 的 form 属性，只有 row/item 页才传。
 * 因此这里绝不读 props.form，一律走 inject 面自取的 ConfigForm。
 */

window.__ModuleLoader__.load({
  id: '@wenaixi/dsh-superpower',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    var React = require('react');
    var h = React.createElement;
    var P = require('@deepseek-ai/dsh-client-ui-primitives');

    // 宿主条目 id，同时也是 settings 命名空间键；与 cordis.patch.yml 的 id 逐字相同
    var SETTINGS_NAMESPACE = 'superpowers';
    var PACKAGE_NAME = '@wenaixi/dsh-superpower';
    var PROVIDER_NAME = 'superpowers';
    var PROVIDER_RANK = 10;
    var SKILL_SOURCE = 'bundled';
    /* 面板所在的包版本。写死而非从宿主取：浏览器侧读不到 package.json，
       而版本号正是排查「装的是哪一版、界面是不是这一版」时唯一能直接看到的东西。 */
    var PACKAGE_VERSION = '7.6.0';
    var NS = 'dsh-superpower';
    var DISABLED_FIELD = 'disabled';
    /* v7.3.0 及之前的双侧禁言表。面板写入成功后会把它们 unset，
       这里仍需列出：迁移那批操作的路径必须与 schema 里的字段名逐字一致。 */
    var LEGACY_FIELDS = ['modelDisabled', 'userDisabled'];

    /**
     * 面板渲染所需的技能清单，按 skills/ 目录名升序。
     *
     * 浏览器读不到 skills/ 目录，只能内联；scripts/lib/client-manifest.mjs 在构建期
     * 逐项比对本清单与磁盘编目，任何漂移都会让构建失败。
     */
    const SKILL_CATALOG = [
      { name: 'brainstorming', description: 'Superpower Skill：创意工作前必用——创建功能、构建组件、新增能力或变更行为前，先澄清用户意图、需求与设计，再进入实现。', descriptionEn: 'Superpower Skill: You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.' },
      { name: 'diagnosing-superpowers', description: 'Superpower Skill：当 superpowers 会话出错、human partner 想查原因（重复工作、忽略计划、技能未触发、耗时过长、成本过高、结果不佳）或想为维护者建缺陷报告时，适用当前或历史会话。', descriptionEn: 'Superpower Skill: Use when a superpowers session went wrong and your human partner wants to know why - repeated work, ignored plans, stumbles, poor results, a skill that didn\'t fire, it took too long, why is it so expensive, what is it doing - or wants to build a bug report for the superpowers maintainers, for the current session or a past one identified by id or path, on any harness.' },
      { name: 'dispatching-parallel-agents', description: 'Superpower Skill：面向 2 个以上无共享状态、无前后依赖的独立任务，并行委派多个 subagent 协同处理的高效分发模式。', descriptionEn: 'Superpower Skill: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies' },
      { name: 'executing-plans', description: 'Superpower Skill：当你在本会话中亲自作为实现者执行实施计划时使用——human partner 选择了内联执行，或环境不提供 subagent 工具。', descriptionEn: 'Superpower Skill: Use when executing an implementation plan in the current session as the implementer yourself — your human partner chose inline execution, or no subagent tool is available' },
      { name: 'finishing-a-development-branch', description: 'Superpower Skill：实现完成且全部测试通过后，用于决定分支集成方式，支持本地合并、创建 PR 或保留分支等完整收尾流程。', descriptionEn: 'Superpower Skill: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work' },
      { name: 'receiving-code-review', description: 'Superpower Skill：收到代码评审意见时使用，实施建议前需技术验证与澄清，适用于反馈模糊或存疑场景，强调严谨核实而非盲从。', descriptionEn: 'Superpower Skill: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation' },
      { name: 'requesting-code-review', description: 'Superpower Skill：在任务完成、重大功能实现或准备合并到主分支时发起，用于校验实现是否符合需求与质量标准，建议定期执行。', descriptionEn: 'Superpower Skill: Use when completing tasks, implementing major features, or before merging to verify work meets requirements' },
      { name: 'subagent-driven-development', description: 'Superpower Skill：在当前会话内执行包含独立任务的实现计划时使用，基于 subagent 分发与逐任务评审保障质量。', descriptionEn: 'Superpower Skill: Use when executing implementation plans with independent tasks in the current session' },
      { name: 'systematic-debugging', description: 'Superpower Skill：遇到缺陷、测试失败或异常行为时使用，要求先完成根因分析再提出修复，确保系统化调试。', descriptionEn: 'Superpower Skill: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes' },
      { name: 'test-driven-development', description: 'Superpower Skill：实现新功能或修复缺陷时，编写实现代码前先写测试的测试驱动开发完整指南与流程约束规范。', descriptionEn: 'Superpower Skill: Use when implementing any feature or bugfix, before writing implementation code' },
      { name: 'using-git-worktrees', description: 'Superpower Skill：适用于需与当前 worktree 隔离的功能开发或执行实现计划前，通过原生工具优先、git worktree 兜底的方式确保独立 worktree 就绪。', descriptionEn: 'Superpower Skill: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback' },
      { name: 'using-superpowers', description: 'Superpower Skill：适用于任何对话开始前，建立技能查找与调用规范，要求在任何回复前优先调用相关技能，包括澄清问题。', descriptionEn: 'Superpower Skill: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions' },
      { name: 'verification-before-completion', description: 'Superpower Skill：在声称完成、修复或通过前强制执行校验，用于提交或创建 PR 前必须运行验证命令并确认输出，始终以证据为准而非断言。', descriptionEn: 'Superpower Skill: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always' },
      { name: 'writing-plans', description: 'Superpower Skill：当已具备清晰的需求规格或多步骤 task description 且尚未开始编码时使用，用于把需求拆解为结构清晰、粒度可控、可直接执行、可测试与可验证的完整实施计划。', descriptionEn: 'Superpower Skill: Use when you have a spec or requirements for a multi-step task, before touching code' },
      { name: 'writing-skills', description: 'Superpower Skill：在创建新技能、编辑或重构现有技能，以及在部署前验证技能可用性、合规性与实际生效情况时使用。', descriptionEn: 'Superpower Skill: Use when creating new skills, editing existing skills, or verifying skills work before deployment' },
    ];

    var zh = {
      title: '技能开关',
      intro: '逐个控制本包 15 个技能是否可用。关闭后模型看不到它，你也无法手动调用。立即生效，当前进行中的这一轮不受影响。',
      invocable: '启用',
      invocableHint: '关闭后该技能不再出现在模型可用技能目录中，skill 工具调用会被拒，也不再出现在斜杠命令补全与命令行技能清单里',
      search: '按名称或描述过滤技能',
      enableAll: '全部开启',
      disableAll: '全部关闭',
      resetAll: '恢复默认',
      resetHint: '清空禁言表，15 个技能全部回到默认开启',
      disableAllHint: '关闭全部：模型不再看到这些技能，你也无法手动调用',
      empty: '没有匹配的技能',
      writeFailed: '保存失败',
      hostUnavailable: '当前宿主未提供本插件的配置通道，开关暂不可用',
      provider: '提供方',
      rank: '优先级',
      source: '来源',
      build: '面板版本',
      langTitle: '技能介绍语言（用户「/」唤出菜单及模型可见）',
      langNote: '仅切换技能描述（用户输入「/」唤出与模型可见），技能正文保持英文原版。',
      langZh: '中文',
      langEn: 'English',
      langAuto: '跟随宿主（自动）',
      langUnsetHint: '未配置：当前跟随宿主界面语言（{lang}），可在上方显式切换。仅切换技能描述（用户「/」唤出与模型可见），技能正文保持英文原版。',
    };

    var en = {
      title: 'Skill switches',
      intro: 'Control whether each of the 15 skills in this bundle is available. Off means the model no longer sees it and you cannot invoke it by hand. Changes take effect immediately; the running turn is unaffected.',
      invocable: 'Enabled',
      invocableHint: 'Off removes the skill from the model catalog, rejects skill tool calls, and removes it from slash-command completion and the CLI skill list',
      search: 'Filter skills by name or description',
      enableAll: 'Enable all',
      disableAll: 'Disable all',
      resetAll: 'Restore defaults',
      resetHint: 'Clear the override table; all 15 skills return to enabled by default',
      disableAllHint: 'Turn everything off: the model no longer sees these skills and you cannot invoke them by hand',
      empty: 'No matching skill',
      writeFailed: 'Save failed',
      hostUnavailable: 'The Host does not expose this bundle configuration channel; switches are unavailable',
      provider: 'Provider',
      rank: 'Priority',
      build: 'Panel build',
      source: 'Source',
      langTitle: 'Skill introduction language (visible in "/" slash menu & model)',
      langNote: 'Switches only skill descriptions (visible when typing "/" and to the model); skill bodies stay the English originals.',
      langZh: '中文',
      langEn: 'English',
      langAuto: 'Follow host (auto)',
      langUnsetHint: 'Not set: follows host interface language ({lang}); switch explicitly above. Switches only skill descriptions (visible when typing "/" and to model); skill bodies stay English.',
    };

    /* 官方样式注入契约：style[data-plugin-css="<包名>/<文件名>"]，宿主据此在
       插件卸载时回收。tagId 用包名当前缀，避免与其它插件的模块化类名撞车。 */
    var CSS_ID = PACKAGE_NAME + '/SkillSwitchPanel.module.css';
    var CSS = [
      /* @wenaixi/dsh-superpower 技能开关面板：配色与字阶全部取自 DSH 语义别名，随主题自动切换 */
      '.spSw{display:flex;flex-direction:column;gap:12px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14)}',
      '.spSwTitle{margin:0;font:var(--dsw-font-s-strong-14);color:var(--dsw-alias-label-primary)}',
      '.spSwIntro{margin:0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-secondary)}',
      /* 只读标注：三段等宽小字，tertiary 表示非交互信息 */
      '.spSwMeta{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0;padding:0;list-style:none}',
      '.spSwMetaItem{display:inline-flex;gap:6px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}',
      '.spSwMetaItem code{padding:1px 6px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit}',
      /* 工具条：左按钮右搜索框 */
      '.spSwBar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.spSwSearch{flex:1 1 220px;min-width:0}',
      '.spSwSearch input[type=search]{border-radius:var(--dsw-radius-md)}',
      /* 技能列表：行分隔用相邻兄弟选择器，末行不会多出一条线 */
      '.spSwList{display:flex;flex-direction:column;margin:0;padding:0;list-style:none}',
      '.spSwItem{display:flex;align-items:flex-start;gap:24px;padding:12px 0;border-top:0.5px solid var(--dsw-alias-border-l2)}',
      '.spSwItem:first-child{border-top:0}',
      '.spSwMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.spSwName{margin:0;font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-primary);word-break:break-word}',
      '.spSwDesc{margin:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}',
      '.spSwErr{margin:4px 0 0;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-error-primary)}',
      /* 右侧单开关：标签在左、开关在右 */
      '.spSwSwitch{flex:none;display:flex;align-items:center;gap:10px}',
      /* 语言切换三段选择器：面板顶部全局，中文 / English / 跟随宿主（自动） */
      '.spSwLangBar{display:flex;flex-direction:column;gap:6px;margin-top:2px}',
      '.spSwLangTitle{margin:0;font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-primary)}',
      '.spSwLangNote{margin:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);line-height:1.5}',
      '.spSwLangFailure{margin:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-error)}',
      '.spSwSwitchLabel{white-space:nowrap;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary)}',
      '.spSwEmpty{margin:0;padding:24px 0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary);text-align:center}',
      /* 窄屏：开关区落到文字下方 */
      '@media (max-width:600px){.spSwItem{flex-direction:column;gap:8px}}',
      '@media (prefers-reduced-motion:reduce){.spSw *{transition:none!important}}',
    ].join('\n');

    /**
     * 读取禁言字典里某个技能是否被关闭。缺项与 falsy 一律视为开启。
     */
    function isBlocked(dictionary, name) {
      return !!dictionary && dictionary[name] === true;
    }

    /**
     * 组装一次写入的全部操作：主写入 + 两条清理旧表的 unset。
     *
     * 清理动作与主写合在同一次 mutate 里，因为 ConfigForm 的 mutate 是一批
     * 操作共享一个 revision 栅栏、一次校验、一次持久化决策。这样不存在
     * 「新表写了一部分、旧表还留着」的中间态，也省掉每技能一次额外往返。
     * op 为 enable 时 unset 路径即恢复继承的默认值。
     */
    /* 语言偏好字段：'zh' | 'en' 显式固定；缺失时跟随宿主界面语言（locale active）。 */
    var LANGUAGE_FIELD = 'language';

    /**
     * 读取当前语言偏好（三态）：'zh'/'en' 显式值原样；缺项为 undefined（跟随宿主）。
     * 与宿主侧 readSwitches 同规则，缺失绝不折叠成 zh —— 否则面板无法表达「跟随宿主」。
     */
    function readLanguage(value) {
      var raw = value && value[LANGUAGE_FIELD];
      return raw === 'zh' || raw === 'en' ? raw : undefined;
    }

    function switchOps(name, op) {
      var ops = op === 'disable'
        ? [{ op: 'set', path: [DISABLED_FIELD, name], value: true }]
        : [{ op: 'unset', path: [DISABLED_FIELD, name] }];
      return ops.concat(LEGACY_FIELDS.map(function (field) {
        return { op: 'unset', path: [field] };
      }));
    }

    /**
     * 提交一批写入并按技能名归集失败原因。settle 后清掉这些技能的忙碌态。
     *
     * 用户只要在面板动过一次开关，profile 里就只剩 disabled 一个字段。
     */
    function submit(form, t, names, op, setPending, setFailures, opsOverride) {
      var clear = function (prev) {
        var next = {};
        Object.keys(prev).forEach(function (key) {
          if (names.indexOf(key) < 0) next[key] = prev[key];
        });
        return next;
      };
      setPending(function (prev) {
        var next = clear(prev);
        names.forEach(function (name) { next[name] = true; });
        return next;
      });
      var work = Promise.all(names.map(function (name) {
        return form.mutate(opsOverride || switchOps(name, op)).then(function (accepted) {
          if (accepted === false) throw new Error(t('writeFailed'));
        });
      }));
      work.then(function () {
        setFailures(clear);
      }, function (error) {
        setFailures(function (prev) {
          var next = clear(prev);
          var message = t('writeFailed') + ': ' + String(error && error.message ? error.message : error);
          names.forEach(function (name) { next[name] = message; });
          return next;
        });
      }).then(function () {
        setPending(clear);
      });
    }

    /**
     * 技能开关面板。每个技能一个开关，同时决定模型可见性与用户可调用性。
     *
     * props.useSwitches 来自 inject 面绑定好的 ConfigForm 选择器 hook；
     * props.actions 是本面板独占的写操作面。
     */
    function SkillSwitchPanel(props) {
      var t = props.t;
      var form = props.actions.form;
      var state = props.useSwitches(function (value) { return value; });
      var hostActive = props.useLocaleActive(function (v) { return v && v.preference === 'en' ? 'en' : 'zh'; });

      var keywordState = React.useState('');
      var keyword = keywordState[0];
      var setKeyword = keywordState[1];
      var pendingState = React.useState({});
      var pending = pendingState[0];
      var setPending = pendingState[1];
      var failuresState = React.useState({});
      var failures = failuresState[0];
      var setFailures = failuresState[1];

      if (state.status !== 'ready') {
        return h('div', { className: 'spSw' },
          h('h4', { className: 'spSwTitle' }, t('title')),
          h('p', { className: 'spSwIntro' }, t('hostUnavailable')));
      }

      var value = state.value || {};
      /* disabled 为空而旧表非空时，宿主侧 readSwitches 已把旧值并进来，
         这里读到的就是等效状态；面板不区分自己是读的新表还是旧表。 */
      var disabled = value[DISABLED_FIELD] || {}
      var language = readLanguage(value);
      var langConfigured = language !== undefined;
      var langValue = langConfigured ? language : 'auto';
      var langOptions = [
        { value: 'zh', label: t('langZh') },
        { value: 'en', label: t('langEn') },
        { value: 'auto', label: t('langAuto') },
      ];
      var setLang = function (next) {
        if (next === 'auto') {
          submit(form, t, ['language'], 'enable', setPending, setFailures,
            [{ op: 'unset', path: [LANGUAGE_FIELD] }]);
        } else {
          submit(form, t, ['language'], 'enable', setPending, setFailures,
            [{ op: 'set', path: [LANGUAGE_FIELD], value: next }]);
        }
      };
      var writable = state.writable !== false && state.mode !== 'memory';

      var lower = keyword.trim().toLowerCase();
      /* 描述取词：按当前语言偏好取对应语言文本，两侧都参与搜索过滤。 */
      var skillText = function (skill) {
        var effective = language === undefined ? hostActive : language;
        return effective === 'en' && skill.descriptionEn ? skill.descriptionEn : skill.description;
      };
      var shown = lower === ''
        ? SKILL_CATALOG
        : SKILL_CATALOG.filter(function (skill) {
            var name = skill.name.toLowerCase();
            return name.indexOf(lower) >= 0
              || skill.description.toLowerCase().indexOf(lower) >= 0
              || (skill.descriptionEn || '').toLowerCase().indexOf(lower) >= 0;
          });

      var allNames = SKILL_CATALOG.map(function (skill) { return skill.name; });

      var rows = shown.map(function (skill) {
        var busy = !!pending[skill.name] || !writable;
        var failure = failures[skill.name];
        var on = !isBlocked(disabled, skill.name);
        return h('li', { key: skill.name, className: 'spSwItem' },
          h('div', { className: 'spSwMain' },
            h('div', { className: 'spSwName' }, skill.name),
            h('p', { className: 'spSwDesc' }, skillText(skill)),
            failure ? h('p', { className: 'spSwErr', role: 'alert' }, failure) : null),
          h('div', { className: 'spSwSwitch' },
            h('span', { className: 'spSwSwitchLabel' }, t('invocable')),
            h(P.Switch, {
              checked: on,
              disabled: busy,
              label: t('invocable') + ' ' + skill.name,
              title: t('invocableHint'),
              onChange: function (next) {
                submit(form, t, [skill.name], next ? 'enable' : 'disable', setPending, setFailures);
              },
            })));
      });

      return h('div', { className: 'spSw' },
        h('h4', { className: 'spSwTitle' }, t('title')),
        h('p', { className: 'spSwIntro' }, t('intro')),
        h('div', { className: 'spSwLangBar' },
          h('div', { className: 'spSwLangTitle' }, t('langTitle')),
          h(P.SegmentedControl, {
            id: 'spSwLang',
            label: t('langTitle'),
            value: langValue,
            options: langOptions,
            disabled: !writable || !!pending['language'],
            onChange: setLang,
          }),
          !langConfigured
            ? h('p', { className: 'spSwLangNote' }, t('langUnsetHint', { lang: t(hostActive === 'en' ? 'langEn' : 'langZh') }))
            : h('p', { className: 'spSwLangNote' }, t('langNote')),
          failures['language'] ? h('span', { className: 'spSwLangFailure', role: 'alert' }, failures['language']) : null),
        h('ul', { className: 'spSwMeta' },
          h('li', { className: 'spSwMetaItem' }, t('provider'), h('code', null, PROVIDER_NAME)),
          h('li', { className: 'spSwMetaItem' }, t('rank'), h('code', null, String(PROVIDER_RANK))),
          h('li', { className: 'spSwMetaItem' }, t('source'), h('code', null, SKILL_SOURCE)),
          h('li', { className: 'spSwMetaItem' }, t('build'), h('code', null, PACKAGE_VERSION))),
        h('div', { className: 'spSwBar' },
          h(P.Button, {
            variant: 'outline',
            size: 'sm',
            disabled: !writable,
            title: t('resetHint'),
            onClick: function () {
              submit(form, t, allNames, 'enable', setPending, setFailures);
            },
          }, t('enableAll')),
          h(P.Button, {
            variant: 'outline',
            size: 'sm',
            disabled: !writable,
            title: t('disableAllHint'),
            onClick: function () {
              submit(form, t, allNames, 'disable', setPending, setFailures);
            },
          }, t('disableAll')),
          h(P.Button, {
            variant: 'ghost',
            size: 'sm',
            disabled: !writable,
            title: t('resetHint'),
            onClick: function () {
              submit(form, t, allNames, 'enable', setPending, setFailures);
            },
          }, t('resetAll')),
          h(P.Input, {
            className: 'spSwSearch',
            type: 'search',
            value: keyword,
            placeholder: t('search'),
            'aria-label': t('search'),
            onChange: function (event) { setKeyword(event.target.value); },
          })),
        shown.length === 0
          ? h('p', { className: 'spSwEmpty' }, t('empty'))
          : h('ul', { className: 'spSwList' }, rows));
    }

    /**
     * 注册面板到插件管理页的 bundle 配置插槽。
     *
     * inject 面自带 ConfigForm：bundle 详情页渲染本插槽时不传 form 属性，
     * 只能在这里向宿主取，随后经 hooks 区间合成 useSwitches 选择器 hook。
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'superpowers: dictionaries');

      /* 注入面板样式。必须真注入：类名只写在 CSS 字符串里而不落进 <head>，
         面板会退回浏览器默认样式（16px 正文、无行高、无分隔线），且无任何报错。 */
      if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_ID) + ']')) {
        var tag = document.createElement('style');
        tag.dataset.plugin = PACKAGE_NAME;
        tag.dataset.pluginCss = CSS_ID;
        tag.textContent = CSS;
        document.head.appendChild(tag);
      }

      var form = ctx.configForms.get(SETTINGS_NAMESPACE);

      /* 宿主语言选择器：读 locale 命名空间的 preference（volatile）。
         ConfigForm 自带 subscribe/getSnapshot，渲染器把它包成 useLocaleActive(selector) hook，
         面板侧只做 selector 映射（en -> 'en'，其余 -> 'zh'）。 */
      var localeForm = ctx.configForms.get('locale');

      ctx.slots.inject('plugins.bundle.config', () =>
        ctx.slots.register(
          {
            name: 'plugins.bundle.config',
            key: PACKAGE_NAME,
            locale: NS,
            inject: () => ({ hooks: { switches: form, localeActive: localeForm }, actions: { form } }),
          },
          SkillSwitchPanel,
        ),
      );
    }

    exports.apply = apply;
    exports.inject = ['slots', 'configForms', 'locale'];
    return module.exports;
  },
});
