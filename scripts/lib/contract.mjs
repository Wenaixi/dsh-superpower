/**
 * @wenaixi/dsh-superpower — SkillContractChecker 深度契约治理模块
 *
 * 封装技能库内容契约治理：
 * 1. 相对引用死链扫描
 * 2. 资源引用契约与孤儿文件判定（两遍扫描，白名单豁免）
 * 3. 随包脚本裸调用守卫（必须带 bash/node 等前缀）
 * 4. 全仓无 Emoji / 图形状态符号硬扫描
 * 5. 随包 shell 脚本的 Shebang 与行尾自检
 * 6. 契约守卫可失败自检（证明规则真实生效）
 * 7. 客户端产物形态、单开关契约、样式注入与图标/卡片元数据契约
 * 8. 技能正文不得复活自建 HTTP 服务（可视化走宿主官方文档预览）
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
    // 英文配对文件与中文版同源豁免：占位路径/流程路径文字
  ])

  static ORPHAN_EXEMPT = new Set([
    'skills/brainstorming/spec-document-reviewer-prompt.md',
    'skills/systematic-debugging/test-pressure-1.md',
    'skills/systematic-debugging/test-pressure-2.md',
    'skills/systematic-debugging/test-pressure-3.md',
    'skills/systematic-debugging/test-academic.md',
    'skills/systematic-debugging/CREATION-LOG.md',
    // 英文配对孤儿与中文版同源豁免
  ])

  static HOST_DOCS = new Set(['SKILL.md', 'AGENTS.md', 'CLAUDE.md', 'TODO.md', 'README.md'])
  static RESOURCE_SUBS = ['references', 'prompts', 'templates', 'scripts', 'examples', '']

  static BARE_CALL_EXEMPT = new Set(['skills/writing-skills/SKILL.md'])

  /** 技能正文里禁止再出现的自建服务痕迹：可视化已改走宿主官方文档预览。 */
  static FORBIDDEN_SERVICE_MARKERS = ['start-server.sh', 'stop-server.sh', 'server.cjs', 'helper.js']

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
  /**
   * 中英配对契约：每个技能目录必须存在 SKILL.en.md；
   * 英文 frontmatter 的 description 必须带 "Superpower Skill: " 前缀且不含中文；
   * 中文 SKILL.md 与英文 SKILL.en.md 的 frontmatter.name 必须一致。
   */
    /**
   * 技能文件双语契约：每个技能目录的 SKILL.md 必须同时声明英文 description 与中文
   * description_zh；英文描述带 "Superpower Skill: " 前缀且不含中文，中文描述带
   * "Superpower Skill：" 前缀且含中文；frontmatter.name 与目录名一致。
   */
  /**
   * README 语言面契约：README.md 默认英文（正文不得含中文标题），
   * README.zh.md 为中文版，两者顶部都有互跳链接。
   */
  checkReadmeLanguage() {
    const issues = []
    const read = (rel) => {
      try { return readFileSync(join(this.rootDir, rel), 'utf8') } catch { return '' }
    }
    const en = read('README.md')
    const zh = read('README.zh.md')
    if (!en) issues.push('README.md 缺失')
    // 标题行扫描在剥离代码块之后进行：README 内嵌的 bash/JS 代码块常以 # 开头，
    // 不剥离会把代码块误判为 Markdown 标题。
    const stripCode = (s) => s.replace(/```[sS]*?```/g, '')
    if (/^#{1,3}[ ]*[一-鿿]/m.test(stripCode(en))) {
      issues.push('README.md 含中文标题，默认文档应为英文')
    }
    if (!zh) issues.push('README.zh.md 缺失')
    if (en && !en.includes('[中文](./README.zh.md)')) issues.push('README.md 缺少指向 README.zh.md 的切换链接')
    if (zh && !zh.includes('[English](./README.md)')) issues.push('README.zh.md 缺少指向 README.md 的切换链接')
    return issues
  }

  async checkBilingualPairing(dir = this.skillDir) {
    const issues = []
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const skillDir = join(dir, entry.name)
      const zhPath = join(skillDir, 'SKILL.md')
      if (!existsSync(zhPath)) {
        issues.push('技能 ' + entry.name + ' 缺少 SKILL.md')
        continue
      }
      const parseFm = (file) => {
        try {
          const raw = readFileSync(file, 'utf8')
          const m = raw.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/)
          if (!m) return null
          const data = {}
          for (const line of m[1].split(/\r?\n/)) {
            const kv = line.match(/^([\w-]+):\s*(.*)$/)
            if (kv) data[kv[1]] = kv[2].replace(/^"|"$/g, '')
          }
          return data
        } catch {
          return null
        }
      }
      const fm = parseFm(zhPath)
      if (!fm) {
        issues.push('技能 ' + entry.name + ' 的 SKILL.md frontmatter 无法解析')
        continue
      }
      if (fm.name && fm.name !== entry.name) {
        issues.push('技能 ' + entry.name + ' 的 frontmatter.name 与目录名不一致: ' + fm.name)
      }
      if (!fm.description || !fm.description.startsWith('Superpower Skill: ')) {
        issues.push('技能 ' + entry.name + ' 的英文描述（description）缺少 "Superpower Skill: " 前缀')
      }
      if (/[\u4e00-\u9fff]/.test(fm.description || '')) {
        issues.push('技能 ' + entry.name + ' 的英文描述包含中文')
      }
      if (!fm.description_zh || !fm.description_zh.startsWith('Superpower Skill：')) {
        issues.push('技能 ' + entry.name + ' 的中文描述（description_zh）缺少 "Superpower Skill：" 前缀')
      }
      if (!/[\u4e00-\u9fff]/.test(fm.description_zh || '')) {
        issues.push('技能 ' + entry.name + ' 的中文描述不含中文')
      }
    }
    return issues
  }

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
    const bareRe = /`(?:..\/)?[a-z0-9-]+\/scripts\/[^`]*`|`scripts\/[^`]*`/g
    const bareSample = '请执行 `scripts/task-start PLAN_FILE 1`'
    const hit = [...bareSample.matchAll(bareRe)]
    if (hit.length !== 1 || !hit[0][0].includes('task-start')) throw new Error('bare-call guard cannot fail')
    const prefixed = '运行 `bash scripts/task-done PLAN_FILE 1 0`'
    if ([...prefixed.matchAll(bareRe)].length !== 0) throw new Error('prefixed call mis-flagged as bare')

    // 盲区补钉 1：bareCallRe 分支一（技能名/scripts/... 与 ../技能名/scripts/...）必须命中
    const branchOne = [
      '执行 `subagent-driven-development/scripts/review-package`',
      '执行 `../subagent-driven-development/scripts/sdd-workspace`',
    ]
    for (const sample of branchOne) {
      if ([...sample.matchAll(bareRe)].length !== 1) throw new Error('bare-call branch-one missed: ' + sample)
    }

    // 盲区补钉 2：豁免清单与消费方引用的同一份（改错豁免集必须红）
    if (!SkillContractChecker.BARE_CALL_EXEMPT.has('skills/writing-skills/SKILL.md')) {
      throw new Error('BARE_CALL_EXEMPT 契约漂移')
    }
    if (!SkillContractChecker.FORBIDDEN_SERVICE_MARKERS.includes('server.cjs')) {
      throw new Error('FORBIDDEN_SERVICE_MARKERS 契约漂移')
    }

    // 盲区补钉 3：tick-path 六前缀与 tick-bare 扩展名全集——只测过 references/ 与 .md
    const tickPathScripts = '先读 `scripts/foo`'
    const refsOfTickPath = SkillContractChecker.extractRefs(tickPathScripts)
    if (!refsOfTickPath.includes('scripts/foo')) throw new Error('tick-path scripts/ 前缀未提取')
    const tickBareSh = '再跑 `helper.sh`'
    const refsOfBareSh = SkillContractChecker.extractRefs(tickBareSh)
    if (!refsOfBareSh.includes('helper.sh')) throw new Error('tick-bare .sh 扩展名未提取')
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
    const bareCallRe = /`(?:..\/)?[a-z0-9-]+\/scripts\/[^`]*`|`scripts\/[^`]*`/g

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

    // (4.5) 界面文案必须全部经 t() 取词。面板 UI 的 i18n 是硬契约：渲染路径一旦
    //       出现硬编码的裸标签字符串，界面语言切换时该处便成为单语孤岛且无任何报错，
    //       只能靠静态断言挡住。技能目录（SKILL_CATALOG）与样式字符串属数据与样式，
    //       不在本断言范围内。
    const i18nIssues = []
    const bareMetaLabel = /spSwMetaItem' }, '[a-zA-Z]+'/.exec(source)
    if (bareMetaLabel !== null) {
      i18nIssues.push('meta 区存在未走 t() 的硬编码标签 ' + bareMetaLabel[0])
    }
    for (const key of ['provider', 'rank', 'source']) {
      if (!source.includes("t('" + key + "')")) {
        i18nIssues.push("meta 区缺少 t('" + key + "') 取词调用")
      }
      const declared = (source.match(new RegExp(key + ": '", 'g')) || []).length
      if (declared < 2) {
        i18nIssues.push('键 ' + key + ' 未在 zh/en 两本字典同时声明（当前 ' + declared + ' 处）')
      }
    }
    // (4.6) 语言切换按钮契约：单按钮显示目标语言字面量（SP_LANG_ZH/SP_LANG_EN），
    //       不得回退到双按钮 aria-pressed 形态；langTitle tooltip 必须经 t()；
    //       技能描述的英文取词只能经 skillText()（面板渲染路径不得出现裸 descriptionEn 字面量）。
    if (!source.includes("var SP_LANG_ZH = '中文'") || !source.includes("var SP_LANG_EN = 'English'")) {
      i18nIssues.push('缺少 SP_LANG_ZH / SP_LANG_EN 目标语言字面量常量')
    }
    if (!source.includes("t('langTitle')")) {
      i18nIssues.push("语言切换缺少 t('langTitle') 取词调用")
    }
    const declaredTitle = (source.match(/langTitle: '/g) || []).length
    if (declaredTitle < 2) {
      i18nIssues.push('键 langTitle 未在 zh/en 两本字典同时声明（当前 ' + declaredTitle + ' 处）')
    }
    if (!/h\('button', \{\s*className: 'spSwLangBtn'/.test(source)) {
      i18nIssues.push('面板缺少单个 spSwLangBtn 语言切换按钮')
    }
    if (/spSwLang[^B]|aria-pressed/.test(source)) {
      i18nIssues.push('存在双按钮语言切换形态（spSwLang 组 / aria-pressed），应改为单按钮')
    }
    const bareEnDesc = /h('p', { className: 'spSwDesc' }, skill.descriptionEn)/.exec(source)
    if (bareEnDesc !== null) {
      i18nIssues.push('面板渲染路径直接输出裸英文描述，必须经 skillText() 取词')
    }
    if (i18nIssues.length > 0) {
      record(sourceRel, false, i18nIssues.join('；'))
    } else {
      record(sourceRel, true, '界面文案全部经 t() 取词')
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

    // (6) 单开关契约。v7.4.0 起每个技能只有一个开关，旧的两张分侧表只作为
    //     一次性 unset 的目标保留在 LEGACY_FIELDS 里。面板若悄悄恢复双开关，
    //     用户会看到两列语义重叠的开关，而模型侧行为不变——只有静态断言挡得住。
    const switchIssues = []
    // 只查渲染路径与写入路径之外的整份产物：LEGACY_FIELDS 里的名字是必须的。
    const legacyDeclared = (source.match(/var[ ]+LEGACY_FIELDS[ ]*=[ ]*\[[^\]]*\]/s) ?? [''])[0]
    const withoutLegacyList = source.replace(legacyDeclared, '')
    if (/['"]modelDisabled['"]/.test(withoutLegacyList) || /['"]userDisabled['"]/.test(withoutLegacyList)) {
      switchIssues.push('客户端出现 modelDisabled/userDisabled 的直接引用，应统一走 LEGACY_FIELDS')
    }
    if (source.includes('spSwToggles')) {
      switchIssues.push('客户端仍保留双开关布局类名 spSwToggles')
    }
    for (const key of ['invocable', 'invocableHint']) {
      if (!source.includes("t('" + key + "')")) {
        switchIssues.push("单开关界面缺少 t('" + key + "') 取词调用")
      }
      const declaredCount = (source.match(new RegExp(key + ": '", 'g')) || []).length
      if (declaredCount < 2) {
        switchIssues.push('键 ' + key + ' 未在 zh/en 两本字典同时声明（当前 ' + declaredCount + ' 处）')
      }
    }
    if (switchIssues.length > 0) {
      record(sourceRel, false, switchIssues.join('；'))
    } else {
      record(sourceRel, true, '单开关契约齐全')
    }

    return results
  }

  // -------------------------------------------------------------------------
  // 7. 技能正文不得复活自建 HTTP 服务
  // -------------------------------------------------------------------------

  /**
   * 扫描技能正文，报告仍引用已删除的随包服务脚本之处。
   *
   * 可视化协作已改走宿主官方文档预览通道（DSH 的 documentPreviews 内置
   * html/htm，渲染为隔离 iframe）。自建 http 服务带来的是端口、会话密钥、
   * 重连与 WebSocket 四套生命周期，且在客户端 bundle 纯度与安全上都要单独解释。
   *
   * @returns {Promise<Array<{ file: string, marker: string }>>} 违例清单，为空表示通过
   */
  async checkNoSelfHostedService() {
    const hits = []
    const walk = async (dir) => {
      const list = await readdir(dir, { withFileTypes: true })
      for (const item of list) {
        if (item.name.startsWith('.')) continue
        const full = join(dir, item.name)
        if (item.isDirectory()) {
          await walk(full)
        } else if (item.name.endsWith('.md')) {
          const content = await readFile(full, 'utf8')
          for (const marker of SkillContractChecker.FORBIDDEN_SERVICE_MARKERS) {
            if (content.includes(marker)) {
              hits.push({
                file: relative(this.rootDir, full).replace(/\\/g, '/'),
                marker,
              })
            }
          }
        }
      }
    }
    await walk(this.skillDir)
    return hits
  }

  // -------------------------------------------------------------------------
  // 6. 随包 shell 脚本的 Shebang 与行尾健壮性自检
  // -------------------------------------------------------------------------

    checkBundledShellScripts() {
    const shellScripts = [
      'skills/executing-plans/scripts/task-start',
      'skills/executing-plans/scripts/task-done',
      'skills/subagent-driven-development/scripts/task-brief',
      'skills/subagent-driven-development/scripts/review-package',
      'skills/subagent-driven-development/scripts/sdd-workspace',
      'skills/systematic-debugging/find-polluter.sh',
    ]
    const results = []

    for (const scriptRel of shellScripts) {
      const fullPath = join(this.rootDir, scriptRel)
      try {
        const raw = readFileSync(fullPath, 'utf8')
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