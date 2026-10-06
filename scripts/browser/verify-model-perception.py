"""三阶段闭环：UI 写入 -> 宿主生效 -> UI 回读。

阶段交替执行浏览器动作与宿主侧注册表读取，两侧用同一份 cordis.patch.yml
作为唯一事实来源，故「UI 显示的」与「模型实际看到的」必然是同一份状态的
两次观测，不存在两套真相。

headless 子命令在本 profile 不可用（web app 只收 0 个位置参数），
skills/list 又要求已打开的会话，故模型侧证据取自宿主真实 SkillRegistry。
"""
import sys, io, json, subprocess, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

URL, TOKEN = sys.argv[1], sys.argv[2]
PROFILE_DIR, PATCH, OUT = sys.argv[3], sys.argv[4], sys.argv[5]
CLICK = '(el) => el.click()'
ROW = 'li[class*="spSwItem"]'
SWITCH = ROW + ' [role="switch"]'

PROBE_SRC = """
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { Context, resolveConfig } from '@deepseek-ai/cordis'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import * as sp from '@wenaixi/dsh-superpower'

const tree = parse(readFileSync(process.argv[2], 'utf8')) || []
const entry = tree.find((e) => e && e.id === 'superpowers')
const raw = (entry && entry.config) || {}
const ctx = new Context()
await ctx.plugin(SkillRegistry)
const cfg = resolveConfig(sp.default, {
  providerName: 'superpowers',
  disabled: raw.disabled ?? {},
  modelDisabled: raw.modelDisabled ?? {},
  userDisabled: raw.userDisabled ?? {},
})
await ctx.plugin({ name: sp.default.name, inject: sp.default.inject, apply: sp.default.apply }, cfg)
const snap = await ctx.skills.snapshot()
console.log(JSON.stringify({
  stored: { disabled: raw.disabled ?? {}, modelDisabled: raw.modelDisabled ?? {}, userDisabled: raw.userDisabled ?? {} },
  catalog: snap.skills.map((s) => ({
    name: s.name,
    model: s.invocation.modelInvocable,
    user: s.invocation.userInvocable,
  })),
}))
"""

failures = []
def ok(label, cond, detail=''):
    if not cond:
        failures.append(label)
    print(('PASS  ' if cond else 'FAIL  ') + label + (('  ' + detail) if detail else ''), flush=True)

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

# 用 cwd 相对路径：Windows 的 python 会把含空格的绝对路径原样传给 node，
# 且沙箱下删不掉已写入的临时文件，故只写一次、用 -f 路径，验证完再删。
probe_name = 'probe-loop.mjs'
probe_file = os.path.join(PROFILE_DIR, probe_name)
with open(probe_file, 'w', encoding='utf-8') as fh:
    fh.write(PROBE_SRC)

def host_view():
    proc = subprocess.run(['node', probe_name, PATCH], cwd=PROFILE_DIR,
                          capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
    if proc.returncode != 0:
        print(proc.stdout[-800:])
        print(proc.stderr[-1200:])
        raise SystemExit('host probe failed')
    return json.loads(proc.stdout.strip().splitlines()[-1])

def dump_host(view, title):
    print('--- %s ---' % title, flush=True)
    print('    落盘配置 =', json.dumps(view['stored'], ensure_ascii=False), flush=True)
    for c in view['catalog']:
        flag = '' if (c['model'] and c['user']) else '   <- 被开关屏蔽'
        print('    %-30s model=%-5s user=%-5s%s' % (c['name'], str(c['model']), str(c['user']), flag), flush=True)

def agree(ui_rows, host_catalog, label):
    """UI 显示必须与宿主目录逐行一致。"""
    host = {c['name']: c for c in host_catalog}
    mismatch = [r['name'] for r in ui_rows
                if r['name'] not in host
                or r['on'] != host[r['name']]['model']
                or r['on'] != host[r['name']]['user']]
    ok(label, not mismatch, '不一致: ' + ','.join(mismatch) if mismatch else '15/15 行一致')

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
                                 args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'])
    ctx = browser.new_context(viewport={'width': 1600, 'height': 1300})
    page = ctx.new_page()
    page.goto('%s/?token=%s' % (URL, TOKEN), wait_until='commit', timeout=30000)
    page.wait_for_timeout(9000)
    dlg = page.query_selector('[role=dialog]')
    if dlg and dlg.query_selector('button'):
        dlg.query_selector('button').evaluate(CLICK); page.wait_for_timeout(2500)
    page.get_by_label('插件', exact=True).first.evaluate(CLICK); page.wait_for_timeout(6000)
    page.get_by_text('Superpowers 技能套件', exact=True).first.evaluate(CLICK); page.wait_for_timeout(7000)

    ui = lambda: page.evaluate(PROBE)

    def settle(pred, limit_ms=60000):
        waited, last = 0, ui()
        while waited < limit_ms:
            page.wait_for_timeout(1500); waited += 1500
            cur = ui()
            if pred(cur) and cur == last:
                return cur
            last = cur
        return last

    def wait_idle(limit_ms=60000):
        """等所有开关解除禁用。

        settle 只看 aria-checked：批量写入期间开关值可能已是目标态而 pending
        仍在清，此时开关是 disabled，el.click() 静默无效。故必须等禁用解除。
        """
        waited = 0
        while waited < limit_ms:
            if page.evaluate(
                '() => Array.from(document.querySelectorAll(' + json.dumps(SWITCH) + '))'
                '.every((el) => el.getAttribute("aria-disabled") !== "true" && el.disabled !== true)'
            ):
                return waited
            page.wait_for_timeout(1000); waited += 1000
        return -1

    def click_switch(skill):
        """点某个技能唯一的开关，点前先等解除禁用。"""
        wait_idle()
        page.query_selector('%s:has-text("%s")' % (ROW, skill)) \
            .query_selector('[role="switch"]').evaluate(CLICK)
        page.wait_for_timeout(3500)

    # 阶段一：归零
    print('=== 阶段一：恢复默认 ===', flush=True)
    page.get_by_text('恢复默认', exact=True).first.evaluate(CLICK)
    rows = settle(lambda r: all(x['on'] for x in r))
    wait_idle()
    v1 = host_view()
    dump_host(v1, '阶段一宿主目录')
    ok('阶段一落盘配置为空', v1['stored']['disabled'] == {})
    ok('阶段一 15 个技能两侧全开',
       all(c['model'] and c['user'] for c in v1['catalog']) and len(v1['catalog']) == 15)
    agree(rows, v1['catalog'], '阶段一 UI 与宿主一致')

    # 阶段二：关两个技能
    print('=== 阶段二：UI 关两个技能 ===', flush=True)
    for skill in ('brainstorming', 'writing-plans'):
        click_switch(skill)
    rows = settle(lambda r: not next(x for x in r if x['name'] == 'brainstorming')['on'])
    v2 = host_view()
    dump_host(v2, '阶段二宿主目录')
    host = {c['name']: c for c in v2['catalog']}
    ok('阶段二落盘记下两个技能',
       v2['stored']['disabled'].get('brainstorming') is True
       and v2['stored']['disabled'].get('writing-plans') is True)
    ok('阶段二旧的两张分侧表已被清空',
       v2['stored']['modelDisabled'] == {} and v2['stored']['userDisabled'] == {})
    for skill in ('brainstorming', 'writing-plans'):
        ok('阶段二 %s 两侧均关闭' % skill,
           host[skill]['model'] is False and host[skill]['user'] is False)
    ok('阶段二其余 13 个不受影响',
       all(c['model'] and c['user'] for c in v2['catalog']
           if c['name'] not in ('brainstorming', 'writing-plans')))
    ok('阶段二技能总数仍 15', len(v2['catalog']) == 15)
    agree(rows, v2['catalog'], '阶段二 UI 与宿主一致')
    page.screenshot(path='%s/12-off.png' % OUT, full_page=True)

    # 阶段三：换一个技能，验证只影响被点名的那个
    print('=== 阶段三：UI 只关 dispatching-parallel-agents ===', flush=True)
    page.get_by_text('恢复默认', exact=True).first.evaluate(CLICK)
    settle(lambda r: all(x['on'] for x in r))
    click_switch('dispatching-parallel-agents')
    rows = settle(lambda r: not next(x for x in r if x['name'] == 'dispatching-parallel-agents')['on'])
    v3 = host_view()
    dump_host(v3, '阶段三宿主目录')
    host = {c['name']: c for c in v3['catalog']}
    ok('阶段三落盘只记下该技能',
       v3['stored']['disabled'].get('dispatching-parallel-agents') is True
       and len(v3['stored']['disabled']) == 1)
    ok('阶段三该技能两侧均关闭',
       host['dispatching-parallel-agents']['model'] is False
       and host['dispatching-parallel-agents']['user'] is False)
    ok('阶段三其余 14 个两侧全开',
       all(c['model'] and c['user'] for c in v3['catalog']
           if c['name'] != 'dispatching-parallel-agents'))
    agree(rows, v3['catalog'], '阶段三 UI 与宿主一致')
    page.screenshot(path='%s/13-one-off.png' % OUT, full_page=True)

    # 阶段四：收尾
    print('=== 阶段四：恢复默认收尾 ===', flush=True)
    page.get_by_text('恢复默认', exact=True).first.evaluate(CLICK)
    rows = settle(lambda r: all(x['on'] for x in r))
    v4 = host_view()
    ok('阶段四落盘归零', v4['stored']['disabled'] == {})
    ok('阶段四两侧恢复全开', all(c['model'] and c['user'] for c in v4['catalog']))
    agree(rows, v4['catalog'], '阶段四 UI 与宿主一致')
    browser.close()

try:
    os.remove(probe_file)
except OSError:
    pass

print()
print('FAILURES: ' + (', '.join(failures) if failures else 'none'))
sys.exit(1 if failures else 0)
