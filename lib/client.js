/**
 * @wenaixi/dsh-superpower — 浏览器半侧：技能开关面板
 *
 * 本文件是手写的 CJS factory 源，由 scripts/build-client.mjs 原样复制到 lib/client.js。
 * 不经 tsc 编译：DSH 客户端要求工厂形态的同步导出，tsc 无法产出；且一旦存在两个产物
 * 来源，两份产物必然漂移，且漂移时机取决于构建顺序。
 *
 * 面板落在插件管理页中本包卡片的详情页（plugins.bundle.config 插槽，key 为包名）。
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
    var NS = 'dsh-superpower';
    var MODEL_FIELD = 'modelDisabled';
    var USER_FIELD = 'userDisabled';

    /**
     * 面板渲染所需的技能清单，按 skills/ 目录名升序。
     *
     * 浏览器读不到 skills/ 目录，只能内联；scripts/lib/client-manifest.mjs 在构建期
     * 逐项比对本清单与磁盘编目，任何漂移都会让构建失败。
     */
    const SKILL_CATALOG = [
      { name: 'brainstorming', description: 'Superpower Skill：创意工作前必用——创建功能、构建组件、新增能力或变更行为前，先澄清用户意图、需求与设计，再进入实现。' },
      { name: 'diagnosing-superpowers', description: 'Superpower Skill：当 superpowers 会话出错、human partner 想查原因（重复工作、忽略计划、技能未触发、耗时过长、成本过高、结果不佳）或想为维护者建缺陷报告时，适用当前或历史会话。' },
      { name: 'dispatching-parallel-agents', description: 'Superpower Skill：面向 2 个以上无共享状态、无前后依赖的独立任务，并行委派多个 subagent 协同处理的高效分发模式。' },
      { name: 'executing-plans', description: 'Superpower Skill：当你在本会话中亲自作为实现者执行实施计划时使用——human partner 选择了内联执行，或环境不提供 subagent 工具。' },
      { name: 'finishing-a-development-branch', description: 'Superpower Skill：实现完成且全部测试通过后，用于决定分支集成方式，支持本地合并、创建 PR 或保留分支等完整收尾流程。' },
      { name: 'receiving-code-review', description: 'Superpower Skill：收到代码评审意见时使用，实施建议前需技术验证与澄清，适用于反馈模糊或存疑场景，强调严谨核实而非盲从。' },
      { name: 'requesting-code-review', description: 'Superpower Skill：在任务完成、重大功能实现或准备合并到主分支时发起，用于校验实现是否符合需求与质量标准，建议定期执行。' },
      { name: 'subagent-driven-development', description: 'Superpower Skill：在当前会话内执行包含独立任务的实现计划时使用，基于 subagent 分发与逐任务评审保障质量。' },
      { name: 'systematic-debugging', description: 'Superpower Skill：遇到缺陷、测试失败或异常行为时使用，要求先完成根因分析再提出修复，确保系统化调试。' },
      { name: 'test-driven-development', description: 'Superpower Skill：实现新功能或修复缺陷时，编写实现代码前先写测试的测试驱动开发完整指南与流程约束规范。' },
      { name: 'using-git-worktrees', description: 'Superpower Skill：适用于需与当前 worktree 隔离的功能开发或执行实现计划前，通过原生工具优先、git worktree 兜底的方式确保独立 worktree 就绪。' },
      { name: 'using-superpowers', description: 'Superpower Skill：适用于任何对话开始前，建立技能查找与调用规范，要求在任何回复前优先调用相关技能，包括澄清问题。' },
      { name: 'verification-before-completion', description: 'Superpower Skill：在声称完成、修复或通过前强制执行校验，用于提交或创建 PR 前必须运行验证命令并确认输出，始终以证据为准而非断言。' },
      { name: 'writing-plans', description: 'Superpower Skill：当已具备清晰的需求规格或多步骤 task description 且尚未开始编码时使用，用于把需求拆解为结构清晰、粒度可控、可直接执行、可测试与可验证的完整实施计划。' },
      { name: 'writing-skills', description: 'Superpower Skill：在创建新技能、编辑或重构现有技能，以及在部署前验证技能可用性、合规性与实际生效情况时使用。' },
    ];

    var zh = {
      title: '技能开关',
      intro: '逐个控制本包 15 个技能对模型与对人类是否可见。关闭后立即生效，当前进行中的这一轮不受影响。',
      modelInvocable: '模型可调用',
      userInvocable: '用户可调用',
      modelHint: '关闭后该技能不再出现在模型可用技能目录中，skill 工具调用也会被拒绝',
      userHint: '关闭后该技能不再出现在斜杠命令补全与命令行技能清单中',
      search: '按名称或描述过滤技能',
      enableAll: '全部开启',
      disableAll: '全部关闭',
      resetAll: '恢复默认',
      resetHint: '清空两侧的覆盖记录，15 个技能全部回到默认开启',
      disableAllHint: '关闭两侧：模型不再看到这些技能，用户也不再能在命令行调用',
      empty: '没有匹配的技能',
      writeFailed: '保存失败',
      hostUnavailable: '当前宿主未提供本插件的配置通道，开关暂不可用',
      provider: '提供方',
      rank: '优先级',
      source: '来源',
    };

    var en = {
      title: 'Skill switches',
      intro: 'Control per-skill visibility for the model and for humans across the 15 skills in this bundle. Changes take effect immediately; the running turn is unaffected.',
      modelInvocable: 'Model invocable',
      userInvocable: 'User invocable',
      modelHint: 'Off removes the skill from the model catalog and rejects skill tool calls',
      userHint: 'Off removes the skill from slash-command completion and the CLI skill list',
      search: 'Filter skills by name or description',
      enableAll: 'Enable all',
      disableAll: 'Disable all',
      resetAll: 'Restore defaults',
      resetHint: 'Clear both override tables; all 15 skills return to enabled by default',
      disableAllHint: 'Turn off both sides: the model no longer sees these skills and you cannot invoke them by hand',
      empty: 'No matching skill',
      writeFailed: 'Save failed',
      hostUnavailable: 'The Host does not expose this bundle configuration channel; switches are unavailable',
      provider: 'Provider',
      rank: 'Priority',
      source: 'Source',
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
      /* 右侧两列开关：标签在左、开关在右，两行竖排对齐 */
      '.spSwToggles{flex:none;display:grid;grid-template-columns:1fr auto;gap:6px 16px;align-items:center}',
      '.spSwToggle{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary)}',
      '.spSwToggleLabel{white-space:nowrap}',
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
     * 把一条路径写入 ConfigForm。op 为 enable 时 unset 路径即恢复继承的默认值。
     */
    function writeSwitch(form, field, name, op) {
      var ops = op === 'disable'
        ? [{ op: 'set', path: [field, name], value: true }]
        : [{ op: 'unset', path: [field, name] }];
      return form.mutate(ops);
    }

    /**
     * 提交一批写入并按技能名归集失败原因。settle 后清掉这些技能的忙碌态。
     *
     * fields 传数组：一次「两侧恢复默认」要同时清 modelDisabled 与 userDisabled，
     * 传单字段会留下一侧残值，而残值在 UI 上与「已开启」无法区分。
     */
    function submit(form, t, names, fields, op, setPending, setFailures) {
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
        return Promise.all(fields.map(function (field) {
          return writeSwitch(form, field, name, op).then(function (accepted) {
            if (accepted === false) throw new Error(t('writeFailed'));
          });
        }));
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
     * 技能开关面板。每个技能两个原生开关，对应 DSH 的 modelInvocable 与 userInvocable。
     *
     * props.useSwitches 来自 inject 面绑定好的 ConfigForm 选择器 hook；
     * props.actions 是本面板独占的写操作面。
     */
    function SkillSwitchPanel(props) {
      var t = props.t;
      var form = props.actions.form;
      var state = props.useSwitches(function (value) { return value; });

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
      var modelDisabled = value[MODEL_FIELD] || {};
      var userDisabled = value[USER_FIELD] || {};
      var writable = state.writable !== false && state.mode !== 'memory';

      var lower = keyword.trim().toLowerCase();
      var shown = lower === ''
        ? SKILL_CATALOG
        : SKILL_CATALOG.filter(function (skill) {
            var name = skill.name.toLowerCase();
            return name.indexOf(lower) >= 0 || skill.description.toLowerCase().indexOf(lower) >= 0;
          });

      var allNames = SKILL_CATALOG.map(function (skill) { return skill.name; });

      var rows = shown.map(function (skill) {
        var busy = !!pending[skill.name] || !writable;
        var failure = failures[skill.name];
        var modelOn = !isBlocked(modelDisabled, skill.name);
        var userOn = !isBlocked(userDisabled, skill.name);
        return h('li', { key: skill.name, className: 'spSwItem' },
          h('div', { className: 'spSwMain' },
            h('div', { className: 'spSwName' }, skill.name),
            h('p', { className: 'spSwDesc' }, skill.description),
            failure ? h('p', { className: 'spSwErr', role: 'alert' }, failure) : null),
          h('div', { className: 'spSwToggles' },
            h('span', { className: 'spSwToggle spSwToggleLabel' }, t('modelInvocable')),
            h(P.Switch, {
              checked: modelOn,
              disabled: busy,
              label: t('modelInvocable') + ' ' + skill.name,
              title: t('modelHint'),
              onChange: function (next) {
                submit(form, t, [skill.name], [MODEL_FIELD], next ? 'enable' : 'disable', setPending, setFailures);
              },
            }),
            h('span', { className: 'spSwToggle spSwToggleLabel' }, t('userInvocable')),
            h(P.Switch, {
              checked: userOn,
              disabled: busy,
              label: t('userInvocable') + ' ' + skill.name,
              title: t('userHint'),
              onChange: function (next) {
                submit(form, t, [skill.name], [USER_FIELD], next ? 'enable' : 'disable', setPending, setFailures);
              },
            })));
      });

      return h('div', { className: 'spSw' },
        h('h4', { className: 'spSwTitle' }, t('title')),
        h('p', { className: 'spSwIntro' }, t('intro')),
        h('ul', { className: 'spSwMeta' },
          h('li', { className: 'spSwMetaItem' }, t('provider'), h('code', null, PROVIDER_NAME)),
          h('li', { className: 'spSwMetaItem' }, t('rank'), h('code', null, String(PROVIDER_RANK))),
          h('li', { className: 'spSwMetaItem' }, t('source'), h('code', null, SKILL_SOURCE))),
        h('div', { className: 'spSwBar' },
          h(P.Button, {
            variant: 'outline',
            size: 'sm',
            disabled: !writable,
            title: t('resetHint'),
            onClick: function () {
              submit(form, t, allNames, [MODEL_FIELD, USER_FIELD], 'enable', setPending, setFailures);
            },
          }, t('enableAll')),
          h(P.Button, {
            variant: 'outline',
            size: 'sm',
            disabled: !writable,
            title: t('disableAllHint'),
            onClick: function () {
              submit(form, t, allNames, [MODEL_FIELD, USER_FIELD], 'disable', setPending, setFailures);
            },
          }, t('disableAll')),
          h(P.Button, {
            variant: 'ghost',
            size: 'sm',
            disabled: !writable,
            title: t('resetHint'),
            onClick: function () {
              submit(form, t, allNames, [MODEL_FIELD, USER_FIELD], 'enable', setPending, setFailures);
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

      ctx.slots.inject('plugins.bundle.config', () =>
        ctx.slots.register(
          {
            name: 'plugins.bundle.config',
            key: PACKAGE_NAME,
            locale: NS,
            inject: () => ({ hooks: { switches: form }, actions: { form } }),
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
