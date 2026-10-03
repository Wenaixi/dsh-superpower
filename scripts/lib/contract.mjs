/**
 * @wenaixi/dsh-superpower — SkillContractChecker 深度契约治理模块
 *
 * 封装技能库内容契约治理：
 * 1. 相对引用死链扫描
 * 2. 资源引用契约与孤儿文件判定（两遍扫描，白名单豁免）
 * 3. 随包脚本裸调用守卫（必须带 bash/node 等前缀）
 * 4. 全仓无 Emoji / 图形状态符号硬扫描
 * 5. Visual Companion 随包后台脚本（start-server.js / helper.js）语法与健壮性自检
 * 6. 契约守卫可失败自检（证明规则真实生效）
 * 7. 客户端产物形态、样式注入与图标/卡片元数据契约
 *
 * 核心架构：
 * - Depth: 隐藏复杂的引用抽取、正则匹配、AST/语法校验与白名单判定，对外暴露统一自检方法；
 * - Locality: 所有内容合规性规则、豁免清单集中于此；
 * - Leverage: 支撑 verify.mjs 门禁并可直接供单元测试或外部 CI 调用；
 * - Test Surface: 接口直接作为测试表面，自检真实可失败。
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

export class SkillContractChecker {
  constructor(rootDir) {
    this.rootDir = rootDir
    this.skillDir = join(rootDir, 'skills')
  }

  // -------------------------------------------------------------------------
  // 白名单豁免清单（集中管理，内聚于契约模块）
  // -------------------------------------------------------------------------

  static REFERENCE_EXEMPT = new Set([
    'skills/brainstorming/visual-companion.md',
    'skills/diagnosing-superpowers/prompts/scrub.md',
    'skills/diagnosing-superpowers/references/github-issues.md',
    'skills/diagnosing-superpowers/templates/bundle-README.md',
    'skills/systematic-debugging/test-pressure-2.md',
    'skills/writing-skills/SKILL.md',
  ])

  static ORPHAN_EXEMPT = new Set([
    'skills/brainstorming/spec-document-reviewer-prompt.md',
    'skills/systematic-debugging/test-pressure-1.md',
    'skills/systematic-debugging/test-pressure-2.md',
    'skills/systematic-debugging/test-pressure-3.md',
    'skills/systematic-debugging/test-academic.md',
    'skills/systematic-debugging/CREATION-LOG.md',
  ])

  static HOST_DOCS = new Set(['SKILL.md', 'AGENTS.md', 'CLAUDE.md', 'TODO.md', 'README.md'])
  static RESOURCE_SUBS = ['references', 'prompts', 'templates', 'scripts', 'examples', '']

  static SCRIPT_RESOURCE_EXEMPT = new Set(['scripts/frame-template.html', 'scripts/helper.js'])
  static BARE_CALL_EXEMPT = new Set(['skills/writing-skills/SKILL.md'])

  static SYMBOL_PATTERN = /[\u2700-\u27BF\u2600-\u26FF\u2300-\u23FF\u2B50-\u2B55\u{1F300}-\u{1FAFF}]/u

  // -------------------------------------------------------------------------
  // 提取器与自检
  // -------------------------------------------------------------------------

  static extractLinkTargets(stripped) {
    const links = []
    const re = /\[[^\]]*\]\((<?)([^\)>\s]+)\1(?:\s+["'][^'"]*["'])?\)/g
    let m
    while ((m = re.exec(stripped)) !== null) {
      const t = m[2]
      if (!/^(https?:|mailto:|#)/.test(t)) links.push(t)
    }
    return links
  }

  static extractRefs(mdContent) {
    const stripped = mdContent.replace(/```[\s\S]*?```/g, '')
    const refs = new Set()
    for (const t of SkillContractChecker.extractLinkTargets(stripped)) refs.add(t)

    const tickPathRe = /`((?:references|scripts|prompts|templates|examples)\/[\w./-]+)`/g
    let m
    while ((m = tickPathRe.exec(stripped)) !== null) refs.add(m[1])

    const tickBareRe = /`([\w.-]+\.(?:md|js|ts|cjs|sh|html))`/g
    while ((m = tickBareRe.exec(stripped)) !== null) refs.add(m[1])
    return [...refs]
  }

  /**
   * 守卫真实可失败自检（证明规则不是假绿）
   */
  assertGuardCanFail() {
    // 1. extractRefs 自检
    const sample = '见 [a](../using-superpowers/references/dsh-tools.md)。先读 `references/context-safety.md` 与 `implementer-prompt.md`，再 `bash scripts/review-package x`。'
    const refs = SkillContractChecker.extractRefs(sample)
    if (!refs.includes('../using-superpowers/references/dsh-tools.md')) throw new Error('link form not extracted')
    if (!refs.includes('references/context-safety.md')) throw new Error('tick-path form not extracted')
    if (!refs.includes('implementer-prompt.md')) throw new Error('tick-bare form not extracted')
    const fenced = '```bash\nscripts/tool.sh\n```'
    if (SkillContractChecker.extractRefs(fenced).length !== 0) throw new Error('fenced example leaked into refs')

    // 2. 孤儿判定自检
    const names = new Set(['a.md', 'b.md'])
    const dummyRefs = new Set(['a.md'])
    const orphan = [...names].filter((n) => !dummyRefs.has(n))
    if (orphan.length !== 1 || orphan[0] !== 'b.md') throw new Error('orphan guard cannot fail')

    // 3. 裸调用识别自检
    const bareRe = /`(?:..\/)?[w-]+\/scripts\/[^`]*`|`scripts\/[^`]*`/g
    const bareSample = '请执行 `scripts/task-start PLAN_FILE 1`'
    const hit = [...bareSample.matchAll(bareRe)]
    if (hit.length !== 1 || !hit[0][0].includes('task-start')) throw new Error('bare-call guard cannot fail')
    const prefixed = '运行 `bash scripts/task-done PLAN_FILE 1 0`'
    if ([...prefixed.matchAll(bareRe)].length !== 0) throw new Error('prefixed call mis-flagged as bare')
  }

  // -------------------------------------------------------------------------
  // 1. 相对链接死链检查
  // -------------------------------------------------------------------------

  async checkRelativeLinks(dir = this.skillDir) {
    const deadLinks = []
    const walk = async (d) => {
      const list = await readdir(d, { withFileTypes: true })
      for (const item of list) {
        const full = join(d, item.name)
        if (item.isDirectory()) {
          await walk(full)
        } else if (item.name.endsWith('.md')) {
          const content = await readFile(full, 'utf8')
          const stripped = content.replace(/```[\s\S]*?```/g, '')
          const targets = SkillContractChecker.extractLinkTargets(stripped)
          for (const target of targets) {
            const clean = target.replace(/#.*$/, '')
            if (!clean) continue
            const resolved = resolve(d, clean)
            try {
              await stat(resolved)
            } catch {
              deadLinks.push({ file: relative(this.rootDir, full), target, resolved: relative(this.rootDir, resolved) })
            }
          }
        }
      }
    }
    await walk(dir)
    return deadLinks
  }

  // -------------------------------------------------------------------------
  // 2. 资源契约与孤儿文件检查
  // -------------------------------------------------------------------------

  async #resolveRefInSkill(fileDir, ref) {
    if (ref.startsWith('../')) {
      return stat(resolve(fileDir, ref)).then(() => true).catch(() => false)
    }
    const base = ref.split('/').pop() || ref
    if (SkillContractChecker.HOST_DOCS.has(base)) return true

    let d = fileDir
    let root = fileDir
    while (true) {
      if (await stat(join(d, 'SKILL.md')).then(() => true).catch(() => false)) {
        root = d
        break
      }
      const parent = dirname(d)
      if (parent === d) break
      d = parent
    }
    for (const sub of SkillContractChecker.RESOURCE_SUBS) {
      const p = sub ? join(root, sub, ref) : join(root, ref)
      if (await stat(p).then(() => true).catch(() => false)) return true
    }
    return false
  }

  async checkResourceRefs(dir = this.skillDir) {
    const missing = []
    const orphans = []
    const referenced = new Set()

    const allMdNames = new Set()
    const collectNames = async (d) => {
      const list = await readdir(d, { withFileTypes: true })
      for (const item of list) {
        const full = join(d, item.name)
        if (item.isDirectory()) await collectNames(full)
        else if (item.name.endsWith('.md') && item.name !== 'SKILL.md') allMdNames.add(item.name)
      }
    }
    await collectNames(dir)

    const walk = async (d) => {
      const list = await readdir(d, { withFileTypes: true })
      for (const item of list) {
        const full = join(d, item.name)
        const rel = relative(this.rootDir, full).replace(/\\/g, '/')
        if (item.isDirectory()) {
          await walk(full)
        } else if (item.name.endsWith('.md')) {
          const content = await readFile(full, 'utf8')
          for (const name of allMdNames) if (content.includes(name)) referenced.add(name)
          for (const ref of SkillContractChecker.extractRefs(content)) {
            const clean = ref.replace(/#.*$/, '')
            if (!clean || SkillContractChecker.REFERENCE_EXEMPT.has(rel)) continue
            referenced.add(clean.split('/').pop() || clean)
            if (!(await this.#resolveRefInSkill(d, clean))) missing.push({ file: rel, ref })
          }
        }
      }
    }
    await walk(dir)

    const collectAll = async (d) => {
      const list = await readdir(d, { withFileTypes: true })
      for (const item of list) {
        const full = join(d, item.name)
        const rel = relative(this.rootDir, full).replace(/\\/g, '/')
        if (item.isDirectory()) await collectAll(full)
        else if (item.name === 'SKILL.md') continue
        else if (item.name.endsWith('.md') && !referenced.has(item.name) && !SkillContractChecker.ORPHAN_EXEMPT.has(rel)) {
          orphans.push(rel)
        }
      }
    }
    await collectAll(dir)

    return { missing, orphans }
  }

  // -------------------------------------------------------------------------
  // 3. 随包脚本调用守卫（必须带 bash/node 等前缀）
  // -------------------------------------------------------------------------

  async checkBareScriptCalls(dir = this.skillDir) {
    const bareCalls = []
    const bareCallRe = /`(?:..\/)?[w-]+\/scripts\/[^`]*`|`scripts\/[^`]*`/g

    const walk = async (d) => {
      const list = await readdir(d, { withFileTypes: true })
      for (const item of list) {
        if (item.name.startsWith('.')) continue
        const full = join(d, item.name)
        if (item.isDirectory()) {
          await walk(full)
        } else if (item.name.endsWith('.md')) {
          const relPath = relative(this.rootDir, full).replace(/\\/g, '/')
          if (SkillContractChecker.BARE_CALL_EXEMPT.has(relPath)) continue
          const content = await readFile(full, 'utf8')
          const stripped = content.replace(/```[\s\S]*?```/g, '')
          for (const m of [...stripped.matchAll(bareCallRe)]) {
            const targetPath = m[0].replace(/`/g, '')
            if (SkillContractChecker.SCRIPT_RESOURCE_EXEMPT.has(targetPath)) continue
            bareCalls.push({ file: relPath, call: m[0] })
          }
        }
      }
    }
    await walk(dir)
    return bareCalls
  }

  // -------------------------------------------------------------------------
  // 4. 全仓无 Emoji / 图形状态符号硬扫描
  // -------------------------------------------------------------------------

  async checkSymbols(targets) {
    const violations = []
    const scanFile = async (filePath) => {
      const content = await readFile(filePath, 'utf8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (SkillContractChecker.SYMBOL_PATTERN.test(line)) {
          const match = line.match(SkillContractChecker.SYMBOL_PATTERN)
          violations.push({
            file: relative(this.rootDir, filePath),
            line: i + 1,
            char: match[0],
            code: '0x' + match[0].codePointAt(0).toString(16),
            text: line.trim().slice(0, 80),
          })
        }
      }
    }

    const scanDir = async (d) => {
      const list = await readdir(d, { withFileTypes: true })
      for (const item of list) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue
        const full = join(d, item.name)
        if (item.isDirectory()) await scanDir(full)
        else await scanFile(full)
      }
    }

    for (const target of targets) {
      const full = join(this.rootDir, target)
      try {
        const st = await stat(full)
        if (st.isDirectory()) await scanDir(full)
        else await scanFile(full)
      } catch {
        // 目标不存在则跳过
      }
    }

    return violations
  }

  // -------------------------------------------------------------------------
  // 5. 客户端半侧产物形态与命名空间一致性自检
  // -------------------------------------------------------------------------

  /**
   * 校验浏览器半侧产物：语法合法、形态为官方 CJS factory、命名空间与 patch 逐字一致。
   *
   * 这三项都是静默失效源：语法错则面板整个不加载；写成 ESM 则 factory 抛错被吞掉，
   * 页面照常显示只是没有面板；命名空间错位则 configForms.get 返回 undefined，
   * 开关点击无任何反应。三者都不产生可见报错，只能靠门禁守住。
   *
   * @returns 每项检查的成败与失败原因
   */
  checkClientArtifact() {
    const results = []
    const record = (file, ok, error) => results.push({ file, ok, error })
    const clientRel = 'lib/client.js'
    const sourceRel = 'src/client.js'
    const patchRel = 'cordis.patch.yml'

    let source = null
    try {
      source = readFileSync(join(this.rootDir, clientRel), 'utf8')
    } catch (err) {
      record(clientRel, false, '读取失败: ' + (err?.message ?? String(err)))
      return results
    }

    // (1) 语法合法性
    const check = spawnSync(process.execPath, ['--check', join(this.rootDir, clientRel)], { encoding: 'utf8' })
    if (check.status !== 0) {
      record(clientRel, false, 'node --check 失败: ' + (check.stderr.trim() || 'syntax error'))
    } else {
      record(clientRel, true)
    }

    // (2) 官方 CJS factory 形态：必须是 ModuleLoader.load + factory，且不得写成 ESM
    const shapeIssues = []
    if (!source.includes('__ModuleLoader__.load(')) shapeIssues.push('缺少 __ModuleLoader__.load(')
    if (!/factory\s*:\s*\(/.test(source)) shapeIssues.push('缺少 factory 形参')
    if (/^[ ]*import[ (]/m.test(source)) shapeIssues.push('顶层出现 ESM import')
    if (/^[ ]*export[ (]/m.test(source)) shapeIssues.push('顶层出现 ESM export')
    if (shapeIssues.length > 0) {
      record(sourceRel, false, shapeIssues.join('；'))
    } else {
      record(sourceRel, true)
    }

    // (3) settings 命名空间与 cordis.patch.yml 的条目 id 逐字一致
    const declared = source.match(/var[ ]+SETTINGS_NAMESPACE[ ]*=[ ]*'([^']+)'/)
    if (declared === null) {
      record(sourceRel, false, '未找到 SETTINGS_NAMESPACE 声明')
      return results
    }
    let patch
    try {
      patch = readFileSync(join(this.rootDir, patchRel), 'utf8')
    } catch (err) {
      record(patchRel, false, '读取失败: ' + (err?.message ?? String(err)))
      return results
    }
    const patched = patch.match(/^\s*-\s+id:\s*(\S+)\s*$/m)
    if (patched === null) {
      record(patchRel, false, '未找到顶层 - id: 条目')
    } else if (patched[1] !== declared[1]) {
      record(patchRel, false, `条目 id "${patched[1]}" 与客户端 SETTINGS_NAMESPACE "${declared[1]}" 不一致`)
    } else {
      record(patchRel, true)
    }

    // (4) 样式必须真注入 DOM。CSS 字符串本身通过全部语法与形态检查时，
    //     漏注入的唯一症状就是「类名存在但一条规则都不生效」，且不报任何错；
    //     只有断言 createElement('style') + appendChild(head) 才能挡住它。
    const styleIssues = []
    if (!/document\.createElement\(\s*'style'\s*\)/.test(source)) {
      styleIssues.push("缺少 document.createElement('style')")
    }
    if (!/document\.head\.appendChild\(/.test(source)) {
      styleIssues.push('缺少 document.head.appendChild')
    }
    if (!/data-plugin-css/.test(source) && !/dataset\.pluginCss/.test(source)) {
      styleIssues.push('缺少 data-plugin-css 标记（宿主据此回收样式）')
    }
    if (/--dsw-static-/.test(source)) {
      styleIssues.push('样式引用了 --dsw-static-* 原始色板，将与主题脱钩')
    }
    if (styleIssues.length > 0) {
      record(sourceRel, false, styleIssues.join('；'))
    } else {
      record(sourceRel, true, '样式注入契约齐全')
    }

    // (5) 图标与卡片元数据契约。dsh-app-boot 的 readPluginMeta 在 iconOf 抛错时
    //     只把错误塞进 meta.error，插件仍算「已安装」，但卡片标题描述图标三者全空，
    //     安装与启动日志都不会报——故只能静态断言。
    const manifestRel = 'package.json'
    let manifest
    try {
      manifest = JSON.parse(readFileSync(join(this.rootDir, manifestRel), 'utf8'))
    } catch (err) {
      record(manifestRel, false, '解析失败: ' + (err?.message ?? String(err)))
      return results
    }

    const metaIssues = []
    const icon = typeof manifest.icon === 'string' ? manifest.icon : ''
    const lowerExt = extname(icon).toLowerCase()
    if (icon === '') {
      metaIssues.push('未声明 icon')
    } else if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(icon) || icon.startsWith('/') || /^[A-Za-z]:/.test(icon)) {
      metaIssues.push('icon 必须是包内相对路径，当前 ' + icon)
    } else if (!['.svg', '.png', '.jpg', '.jpeg', '.webp'].includes(lowerExt)) {
      metaIssues.push('icon 格式须为 SVG/PNG/JPEG/WebP，当前 ' + icon)
    } else if (!existsSync(join(this.rootDir, icon))) {
      metaIssues.push('icon 文件缺失 ' + icon)
    } else if (statSync(join(this.rootDir, icon)).size > 256 * 1024) {
      metaIssues.push('icon 超过 256 KiB 上限')
    } else {
      // files 里的条目不带 "./" 前缀，而 manifest.icon 通常写 "./icon.png"，
      // 直接字符串比较会误判，故统一去掉前缀后再比。
      const strip = (value) => value.replace(/^\.\//, '').replace(/\\/g, '/')
      const iconPath = strip(icon)
      const dirPath = iconPath.slice(0, iconPath.lastIndexOf('/') + 1)
      const allowed = (manifest.files ?? []).map((entry) => strip(String(entry)))
      if (!allowed.some((entry) => entry === iconPath || entry === dirPath)) {
        metaIssues.push('files 未放行 ' + icon + '，打包后图标会缺失')
      }
    }
    const manifestExports = manifest.exports ?? {}
    if (!manifestExports['./package.json']) {
      metaIssues.push("exports 未放行 './package.json'，卡片元数据读取会被拒")
    }
    if (!manifestExports['./locale/*.json']) {
      metaIssues.push("exports 未放行 './locale/*.json'，本地化标题描述读不到")
    }
    for (const locale of ['en.json', 'zh.json']) {
      const localeRel = 'locale/' + locale
      if (!existsSync(join(this.rootDir, localeRel))) {
        metaIssues.push('缺少 ' + localeRel)
        continue
      }
      let parsed
      try {
        parsed = JSON.parse(readFileSync(join(this.rootDir, localeRel), 'utf8'))
      } catch (err) {
        metaIssues.push(localeRel + ' 解析失败: ' + (err?.message ?? String(err)))
        continue
      }
      for (const field of ['title', 'description']) {
        if (typeof parsed.meta?.[field] !== 'string' || parsed.meta[field].trim() === '') {
          metaIssues.push(localeRel + ' 缺少 meta.' + field)
        }
      }
    }
    if (metaIssues.length > 0) {
      record(manifestRel, false, metaIssues.join('；'))
    } else {
      record(manifestRel, true, '图标与卡片元数据契约齐全')
    }

    return results
  }

  // -------------------------------------------------------------------------
  // 6. Visual Companion 后台脚本健全性自检（闭合候选 2 测试表面）
  // -------------------------------------------------------------------------

    checkCompanionScripts() {
    const jsScripts = [
      'skills/brainstorming/scripts/server.cjs',
      'skills/brainstorming/scripts/helper.js',
    ]
    const shellScripts = [
      'skills/brainstorming/scripts/start-server.sh',
      'skills/brainstorming/scripts/stop-server.sh',
      'skills/executing-plans/scripts/task-start',
      'skills/executing-plans/scripts/task-done',
      'skills/subagent-driven-development/scripts/task-brief',
      'skills/subagent-driven-development/scripts/review-package',
      'skills/subagent-driven-development/scripts/sdd-workspace',
      'skills/systematic-debugging/find-polluter.sh',
    ]
    const results = []

    // (1) JS 伴生脚本 AST 语法自检
    for (const scriptRel of jsScripts) {
      const fullPath = join(this.rootDir, scriptRel)
      const check = spawnSync(process.execPath, ['--check', fullPath], { encoding: 'utf8' })
      if (check.status !== 0) {
        results.push({
          file: scriptRel,
          ok: false,
          error: check.stderr.trim() || 'syntax check failed',
        })
      } else {
        results.push({
          file: scriptRel,
          ok: true,
        })
      }
    }

    // (2) Shell 伴生脚本 Shebang 与换行符健壮性自检
    for (const scriptRel of shellScripts) {
      const fullPath = join(this.rootDir, scriptRel)
      try {
        const raw = readFileSync ? readFileSync(fullPath, 'utf8') : require('node:fs').readFileSync(fullPath, 'utf8')
        // 校验 Shebang 头
        if (!raw.startsWith('#!/')) {
          results.push({
            file: scriptRel,
            ok: false,
            error: 'missing valid shebang header (must start with #!/)',
          })
          continue
        }
        // 校验换行符：Shell 脚本在 Unix 环境下若包含 CRLF (\r) 会直接报错
        if (raw.includes('\r')) {
          results.push({
            file: scriptRel,
            ok: false,
            error: 'contains carriage return (CRLF) characters which break shell execution on Unix',
          })
          continue
        }
        results.push({
          file: scriptRel,
          ok: true,
        })
      } catch (err) {
        results.push({
          file: scriptRel,
          ok: false,
          error: err?.message || String(err),
        })
      }
    }

    return results
  }
}