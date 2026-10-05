"""浏览器端端到端验证：真实点击技能开关并回读落盘配置。

覆盖：
1. 插件卡片详情页渲染 15 行、每行一个开关、元信息与三个批量按钮；
2. 单技能开关拨动后回读 cordis.patch.yml 确认落盘到 disabled 字段；
3. 全部开启 / 全部关闭 / 恢复默认 三个批量按钮各回到预期状态；
4. 搜索过滤与空态提示。

两处关键写法：
- 行选择一律用面板自身的 class（spSwItem），不用 innerText 反推技能名，
  按文本反推会被没有连字符的技能名（brainstorming）漏掉；
- 每个动作后等待状态收敛而非固定 sleep：一次批量写会连带触发 modelCatalog、
  credentials/describe 等一串刷新，固定秒数读到的是中间态。
"""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

URL, TOKEN, OUT, PATCH, EXPECTED_FILE = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
with open(EXPECTED_FILE, encoding='utf-8') as fh:
    EXPECTED = json.load(fh)

failures = []
def ok(label, cond, detail=''):
    if not cond:
        failures.append(label)
    print(('PASS  ' if cond else 'FAIL  ') + label + (('  ' + detail) if detail else ''), flush=True)

CLICK = '(el) => el.click()'
ROW = 'li[class*="spSwItem"]'
SWITCH = ROW + ' [role="switch"]'
DISABLED_SELECTOR = ROW + ' [role="switch"]'

PROBE = """
() => {
  const rows = [];
  for (const li of document.querySelectorAll('li[class*="spSwItem"]')) {
    const sw = li.querySelectorAll('[role="switch"]');
    if (sw.length !== 1) continue;
    rows.push({
      name: (li.querySelector('[class*="spSwName"]') || {}).innerText || '',
      on: sw[0].getAttribute('aria-checked') === 'true',
    });
  }
  return rows;
}
"""

def read_patch():
    try:
        with open(PATCH, encoding='utf-8') as fh:
            return fh.read()
    except OSError:
        return ''

with sync_playwright() as pw:
    browser = pw.chromium.launch(
        executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    )
    ctx = browser.new_context(viewport={'width': 1600, 'height': 1300})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    def probe():
        return page.evaluate(PROBE)

    def settle(label, predicate, limit_ms=60000):
        """等待状态满足 predicate 且连续两帧读数相同。

        用「稳定」而非「达到目标」判收敛：点击后 UI 会先经历一串刷新
        （modelCatalog、credentials/describe 各自回包），中间帧是半成品；
        而「本来就已经是目标态」的场景（基线归零）不会发生任何变化，
        只等目标会永远等不到变化。故取两帧一致的稳定态为准。
        """
        waited = 0
        last = probe()
        while waited < limit_ms:
            page.wait_for_timeout(1500)
            waited += 1500
            current = probe()
            if predicate(current) and current == last:
                print('      （%s 稳定于 %dms）' % (label, waited), flush=True)
                return current
            last = current
        print('      （%s %dms 内未稳定，返回末帧）' % (label, limit_ms), flush=True)
        return last

    def wait_idle(limit_ms=60000):
        """等所有开关解除禁用。

        settle 只看 aria-checked：写入期间开关值可能已达目标态而 pending 仍在清，
        此时开关是 disabled，el.click() 静默无效且无任何报错。
        """
        waited = 0
        while waited < limit_ms:
            if page.evaluate(
                '() => Array.from(document.querySelectorAll(' + json.dumps(DISABLED_SELECTOR) + '))'
                '.every((el) => el.getAttribute("aria-disabled") !== "true" && el.disabled !== true)'
            ):
                return waited
            page.wait_for_timeout(1000); waited += 1000
        return -1

    def click_switch(skill):
        wait_idle()
        page.query_selector('%s:has-text("%s")' % (ROW, skill)) \
            .query_selector('[role="switch"]').evaluate(CLICK)
        page.wait_for_timeout(2500)

    def click_batch(text):
        wait_idle()
        page.get_by_text(text, exact=True).first.evaluate(CLICK)

    all_on = lambda rows: all(r['on'] for r in rows)

    page.goto('%s/?token=%s' % (URL, TOKEN), wait_until='commit', timeout=30000)
    page.wait_for_timeout(9000)

    dlg = page.query_selector('[role="dialog"]')
    if dlg and dlg.query_selector('button'):
        dlg.query_selector('button').evaluate(CLICK)
        page.wait_for_timeout(3000)
        ok('预览版说明弹层已关闭', page.query_selector('[role="dialog"]') is None)

    page.get_by_label('插件', exact=True).first.evaluate(CLICK)
    page.wait_for_timeout(6000)
    page.screenshot(path='%s/02-plugins.png' % OUT)

    card = page.get_by_text('@wenaixi/dsh-superpower', exact=True).first
    ok('本包卡片出现在插件页', card.is_visible())
    card.evaluate(CLICK)
    page.wait_for_timeout(7000)
    page.screenshot(path='%s/03-detail.png' % OUT, full_page=True)

    body = page.inner_text('body')
    rows = probe()
    ok('面板渲染 15 行技能', len(rows) == 15, '实际 %d' % len(rows))
    ok('技能名与 skills/ 目录逐字一致', [r['name'] for r in rows] == EXPECTED)
    ok('面板开关总数 15（每行一个）',
       page.evaluate('() => document.querySelectorAll(' + json.dumps(SWITCH) + ').length') == 15)
    ok('详情页标题显示版本号', 'v7.4.0' in body)
    ok('面板标题为「技能开关」', '技能开关' in body)
    meta = page.inner_text('[class*="spSwMeta"]')
    ok('元信息三项齐全',
       all(k in meta for k in ('provider', 'superpowers', 'rank', '10', 'source', 'bundled')), meta)
    ok('三个批量按钮齐全', all(t in body for t in ('全部开启', '全部关闭', '恢复默认')))
    page.screenshot(path='%s/04-panel.png' % OUT, full_page=True)

    # 基线归零
    click_batch('恢复默认')
    base = settle('恢复默认到基线', all_on)
    ok('基线状态全部开启', all_on(base),
       'on=%d/%d' % (sum(1 for r in base if r['on']), len(base)))

    # 单技能开关
    ok('定位到 brainstorming 行',
       page.query_selector('%s:has-text("brainstorming")' % ROW) is not None)
    click_switch('brainstorming')
    after = settle('单个开关', lambda r: not next(x for x in r if x['name'] == 'brainstorming')['on'])
    bb = next(x for x in after if x['name'] == 'brainstorming')
    ok('单个开关关闭后为关态', not bb['on'], str(bb))
    ok('面板无报错提示', not page.evaluate(
        '() => document.querySelectorAll(' + json.dumps('[class*="spSwErr"]') + ').length'))
    page.screenshot(path='%s/05-toggle.png' % OUT, full_page=True)
    patch = read_patch()
    ok('配置已落盘 disabled.brainstorming',
       'disabled' in patch and 'brainstorming' in patch, ' '.join(patch.split())[-130:])
    ok('旧的两张分侧表已被清空', 'modelDisabled' not in patch and 'userDisabled' not in patch,
       ' '.join(patch.split())[-130:])

    # 恢复默认
    click_batch('恢复默认')
    after = settle('恢复默认', all_on)
    ok('恢复默认后全部回到开启', all_on(after),
       'on=%d/%d' % (sum(1 for r in after if r['on']), len(after)))
    page.screenshot(path='%s/06-restored.png' % OUT, full_page=True)

    # 全部关闭
    click_batch('全部关闭')
    after = settle('全部关闭', lambda r: all(not x['on'] for x in r))
    ok('全部关闭后全关', all(not r['on'] for r in after),
       '%d/%d' % (sum(1 for r in after if not r['on']), len(after)))
    page.screenshot(path='%s/07-all-off.png' % OUT, full_page=True)

    # 全部开启
    click_batch('全部开启')
    after = settle('全部开启', all_on)
    ok('全部开启后全开', all_on(after),
       'on=%d/%d' % (sum(1 for r in after if r['on']), len(after)))
    page.screenshot(path='%s/08-all-on.png' % OUT, full_page=True)

    # 搜索
    box = page.get_by_label('按名称或描述过滤技能').first
    box.fill('debug')
    page.wait_for_timeout(2500)
    filtered = probe()
    ok('搜索过滤生效（debug 只剩 systematic-debugging）',
       [r['name'] for r in filtered] == ['systematic-debugging'], str([r['name'] for r in filtered]))
    page.screenshot(path='%s/09-search.png' % OUT, full_page=True)

    box.fill('不存在的关键字xyz')
    page.wait_for_timeout(2500)
    ok('空结果显示提示文案', '没有匹配的技能' in page.inner_text('body'))
    page.screenshot(path='%s/10-empty.png' % OUT, full_page=True)
    box.fill('')
    page.wait_for_timeout(2500)
    ok('清空搜索后恢复 15 行', len(probe()) == 15)

    # 收尾：把配置归零，别把实验状态留在验证 profile 里
    click_batch('恢复默认')
    ok('收尾后恢复全开',
       settle('收尾恢复默认', all_on) is not None and all_on(probe()))

    patch = read_patch()
    print('=== cordis.patch.yml（验证收尾后）===', flush=True)
    print(patch, flush=True)
    ok('收尾后禁言表为空', 'disabled: {}' in patch)

    ok('页面无 JS 运行时错误', len(errors) == 0, '; '.join(errors[:3]))
    browser.close()

print()
print('FAILURES: ' + (', '.join(failures) if failures else 'none'))
sys.exit(1 if failures else 0)
