/**
 * @wenaixi/dsh-superpower — SyncEngine 深度模块
 *
 * 封装上游同步复核引擎：双树并行加载、Markdown 块切分、
 * Token 级无损比对、中文化契约豁免矩阵以及结构化差异报告生成。
 *
 * 核心架构设计：
 * - Depth: 将双树 I/O、复杂的 Markdown/代码块分词、豁免规则与控制台打印封装在极简接口之后；
 * - Locality: 集中管理所有同步契约、ASCII 化豁免（find-polluter.sh）与标题数容差（SDD）；
 * - Leverage: 同时支撑 deep、tokens、fences 三大复核入口，外部调用方代码减少 70% 以上；
 * - Test Surface: 对外暴露可纯在内存/测试中调用的结构化比较接口。
 */

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { norm, splitBlocks, splitComment, hasCJK, walkMd, syncSkillsList } from './sync-common.mjs'
import { SkillDocument } from '../../lib/superpowers.js'

export class SyncEngine {
  // 豁免白名单：内聚于引擎内部，外部调用方无需关心
  static NON_MD_EXEMPT = new Set(['systematic-debugging/find-polluter.sh'])
  static TITLE_EXEMPT = new Set(['subagent-driven-development/SKILL.md', 'using-superpowers/SKILL.md'])

  // 已按 DSH 专属化移除的非 DSH 平台参考文档（上游有、本地无 -> 豁免为 INFO）
  static NON_DSH_PLATFORM_REFS = new Set([
    'using-superpowers/references/antigravity-tools.md',
    'using-superpowers/references/claude-code-tools.md',
    'using-superpowers/references/codex-tools.md',
    'using-superpowers/references/gemini-tools.md',
    'using-superpowers/references/hermes-tools.md',
    'using-superpowers/references/muse-tools.md',
    'using-superpowers/references/pi-tools.md',
    'writing-skills/examples/CLAUDE_MD_TESTING.md',
    'writing-skills/anthropic-best-practices.md',
    // v7.4.0 起本地已删除 brainstorming 随包自建服务脚本（可视化改走宿主官方文档预览）
    'brainstorming/scripts/frame-template.html',
    'brainstorming/scripts/helper.js',
    'brainstorming/scripts/server.cjs',
    'brainstorming/scripts/start-server.sh',
    'brainstorming/scripts/stop-server.sh',
  ])

  // 本插件 DSH 专属化中有意改写、与上游人为分叉的文件（两树均存在 -> 跳过内容比对，仅 INFO）
  static DSH_DIVERGENCE_EXEMPT = new Set([
    'brainstorming/scripts/server.cjs',
    'brainstorming/scripts/start-server.sh',
    'brainstorming/visual-companion.md',
    'subagent-driven-development/scripts/sdd-workspace',
  ])

  static TOKEN_PATTERNS = [
    ['参数', /(?<=^|[\s(`])--?[A-Za-z][\w-]*/gm],
    ['环境变量', /\${?[A-Z_][A-Z0-9_]{1,}\}?/g],
    ['占位符', /[<\[{][A-Z][A-Z0-9_]{2,}[>\]}]/g],
    ['脚本路径', /\bscripts\/[\w./-]+/g],
    [
      '命令词',
      /(?<=^\s{0,8})(bash|sh|node|npx|pnpm|npm|git|python3?|pytest|go|cargo|make|docker|kubectl|curl|echo|grep|awk|sed|find|cat|ls|mkdir|rm|chmod|cd|env|security|codesign)\b/gm,
    ],
  ]

  constructor(upstreamDir, localDir = 'skills') {
    this.upstreamDir = upstreamDir || process.env.SP_UPSTREAM || join(process.env.TEMP ?? '/tmp', 'sp-upstream', 'skills')
    this.localDir = localDir
  }

  /**
   * 递归遍历全文件树（包含非 md 文件），按字母升序排列。
   */
  async walkFullTree(dir, base = dir) {
    const out = []
    const dirents = await readdir(dir, { withFileTypes: true })
    for (const e of dirents) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        out.push(...(await this.walkFullTree(p, base)))
      } else {
        out.push(p.slice(base.length + 1).replace(/\\/g, '/'))
      }
    }
    return out.sort()
  }

  /**
   * 提取 Markdown 正文中的各级标题（排除代码块内的 #）。
   */
  extractHeadings(s) {
    return (s.replace(/```[\s\S]*?```/g, '').match(/^#{1,6} /gm) || []).map((h) => h.trim())
  }

  /**
   * 1. 深度复核：双树全文件比对、frontmatter 解析、代码块逐块比对与标题数验证。
   */
  async reviewDeep() {
    const diagnostics = []
    const upFiles = await this.walkFullTree(this.upstreamDir)
    const loFiles = await this.walkFullTree(this.localDir)
    const rels = [...new Set([...upFiles, ...loFiles])]

    let fails = 0
    const notes = []
    let passed = 0

    for (const rel of rels) {
      const upPath = join(this.upstreamDir, rel)
      const loPath = join(this.localDir, rel)
      const upOk = upFiles.includes(rel)
      const loOk = loFiles.includes(rel)

      if (!loOk) {
        if (SyncEngine.NON_DSH_PLATFORM_REFS.has(rel)) {
          diagnostics.push(`INFO [非DSH平台移除] ${rel}（本地已专属化，豁免）`)
          notes.push(rel)
          continue
        }
        diagnostics.push(`FAIL [缺失] ${rel}（上游有，本地无）`)
        fails++
        continue
      }
      if (!upOk) {
        diagnostics.push(`INFO [本地新增] ${rel}`)
        notes.push(rel)
        continue
      }

      const [uRaw, lRaw] = await Promise.all([readFile(upPath, 'utf8'), readFile(loPath, 'utf8')])
      const u = norm(uRaw)
      const l = norm(lRaw)
      const isSkill = rel.endsWith('/SKILL.md')

      // 两树均存在但本地已按 DSH 专属化有意分叉 -> 跳过内容比对
      if (SyncEngine.DSH_DIVERGENCE_EXEMPT.has(rel)) {
        diagnostics.push(`INFO [DSH专属分叉] ${rel}（本地已专属化改写，豁免）`)
        notes.push(rel)
        continue
      }

      // 非 md 文件比对
      if (!rel.endsWith('.md')) {
        if (SyncEngine.NON_DSH_PLATFORM_REFS.has(rel)) {
          diagnostics.push(`INFO [非DSH平台移除] ${rel}（本地已专属化，豁免）`)
          notes.push(rel)
        } else if (!SyncEngine.NON_MD_EXEMPT.has(rel) && u !== l) {
          diagnostics.push(`FAIL [非md不一致] ${rel}`)
          fails++
        } else if (!SyncEngine.NON_MD_EXEMPT.has(rel)) {
          passed++
        } else {
          diagnostics.push(`INFO [非md豁免] ${rel}（符号契约 ASCII 化）`)
          passed++
        }
        continue
      }

      // SKILL.md frontmatter 比对
      if (isSkill) {
        let du
        let dl
        try { du = SkillDocument.fromString(u, rel) } catch { du = undefined }
        try { dl = SkillDocument.fromString(l, rel) } catch { dl = undefined }

        if (!du || !dl) {
          diagnostics.push(`FAIL [frontmatter非法] ${rel}: 上游 "${du ? '合法' : '非法'}" 本地 "${dl ? '合法' : '非法'}"`)
          fails++
          continue
        }
        if (du.name !== dl.name) {
          diagnostics.push(`FAIL [frontmatter.name不一致] ${rel}: 上游 "${du.name}" 本地 "${dl.name}"`)
          fails++
        }
        if (!/^Superpower Skill: /.test(dl.description)) {
          diagnostics.push(`FAIL [description英文前缀缺失] ${rel}: "${dl.description.slice(0, 40)}"`)
          fails++
        } else if (/[\u4e00-\u9fff]/.test(dl.description)) {
          diagnostics.push(`FAIL [description含中文] ${rel}`)
          fails++
        }
        if (!/^Superpower Skill：/.test(dl.descriptionZh)) {
          diagnostics.push(`FAIL [description_zh前缀缺失] ${rel}: "${dl.descriptionZh.slice(0, 40)}"`)
          fails++
        } else if (!/[\u4e00-\u9fff]/.test(dl.descriptionZh)) {
          diagnostics.push(`FAIL [description_zh未中文化] ${rel}`)
          fails++
        }
      }

      // 代码块逐块核验
      if (SyncEngine.NON_DSH_PLATFORM_REFS.has(rel)) {
        diagnostics.push(`INFO [非DSH平台移除] ${rel}（本地已专属化，豁免）`)
        notes.push(rel)
        continue
      }
      const ub = splitBlocks(u)
      const lb = splitBlocks(l)
      if (ub.length !== lb.length) {
        diagnostics.push(`FAIL [代码块数] ${rel}: ${ub.length} -> ${lb.length}`)
        fails++
      } else {
        for (let i = 0; i < ub.length; i++) {
          if (ub[i].body === lb[i].body) continue
          const a = ub[i].body.split('\n')
          const b = lb[i].body.split('\n')
          if (a.length !== b.length) {
            diagnostics.push(`NOTE [块行数] ${rel} #${i + 1} (${ub[i].lang || '?'}): ${a.length} -> ${b.length}（中文换行差异，需人工复核）`)
            notes.push(`${rel} #${i + 1}`)
            continue
          }
          for (let j = 0; j < a.length; j++) {
            if (a[j] === b[j]) continue
            const [ab, ac] = splitComment(a[j])
            const [bb, bc] = splitComment(b[j])
            if (ab === bb && ac !== bc) continue
            if (hasCJK(b[j]) && !/^[\s|`\-#\d]/.test(b[j].trim()) && (ub[i].lang === 'dot' || ub[i].lang === '')) continue
            diagnostics.push(`NOTE [块内容] ${rel} #${i + 1} (${ub[i].lang || '?'}) L${j + 1}`)
            diagnostics.push(`    上游: ${a[j].slice(0, 160)}`)
            diagnostics.push(`    本地: ${b[j].slice(0, 160)}`)
            notes.push(`${rel} #${i + 1}`)
          }
        }
      }

      // SKILL.md 标题数核验
      if (isSkill) {
        const hu = this.extractHeadings(u)
        const hl = this.extractHeadings(l)
        if (SyncEngine.TITLE_EXEMPT.has(rel) && hl.length === hu.length + 1) {
          diagnostics.push(`INFO [标题数豁免] ${rel}: ${hu.length} -> ${hl.length}（本地增补小节）`)
        } else if (hu.length !== hl.length) {
          diagnostics.push(`FAIL [标题数] ${rel}: ${hu.length} -> ${hl.length}`)
          fails++
        }
      }

      passed++
    }

    diagnostics.push(`\n==== 汇总 ====`)
    diagnostics.push(`检查文件数: ${rels.length}（上游 ${upFiles.length} / 本地 ${loFiles.length}）`)
    diagnostics.push(`FAIL: ${fails}  NOTE: ${notes.length}`)
    diagnostics.push(`通过（含契约允许的本地化差异）: ${passed}`)

    return {
      totalFiles: rels.length,
      upstreamCount: upFiles.length,
      localCount: loFiles.length,
      fails,
      notes,
      passed,
      ok: fails === 0,
      diagnostics,
    }
  }

  /**
   * 2. Token 级比对：确保代码块内的命令、参数、路径、环境变量在本地化后逐字保留。
   */
  async reviewTokens() {
    const diagnostics = []
    const mdFiles = await walkMd(this.upstreamDir)
    const issues = []
    let scanned = 0

    const codeOnly = (s) => [...s.matchAll(/\`\`\`(\w*)[^\n]*\n([\s\S]*?)\`\`\`/g)].map((m) => m[2]).join('\n')

    for (const rel of mdFiles) {
      if (SyncEngine.NON_DSH_PLATFORM_REFS.has(rel)) continue
      if (SyncEngine.DSH_DIVERGENCE_EXEMPT.has(rel)) continue
      let lRaw = ''
      try {
        lRaw = norm(await readFile(join(this.localDir, rel), 'utf8'))
      } catch {
        continue
      }
      const uCode = codeOnly(norm(await readFile(join(this.upstreamDir, rel), 'utf8')))
      const lAll = lRaw.replace(/\r\n/g, '\n')
      scanned++

      for (const [label, re] of SyncEngine.TOKEN_PATTERNS) {
        const found = new Set([...uCode.matchAll(re)].map((m) => m[0]))
        const missing = [...found].filter((t) => !lAll.includes(t))
        if (missing.length) {
          issues.push(`${rel} [${label}] 本地缺失: ${missing.join(' | ')}`)
        }
      }
    }

    diagnostics.push(`已扫描文档: ${scanned}`)
    diagnostics.push(issues.length ? '发现 token 缺失：' : 'token 级校验：全部通过（无缺失）')
    diagnostics.push(...issues.map((issue) => `  ${issue}`))

    return {
      scannedCount: scanned,
      issues,
      ok: issues.length === 0,
      diagnostics,
    }
  }

  /**
   * 3. 代码块逐块并排打印：打印不一致的代码块供精细核对。
   */
  async reviewFences(targets) {
    const resolvedTargets = targets && targets.length > 0 ? targets : await syncSkillsList(this.upstreamDir)
    const diagnostics = []
    const files = []

    for (const rel of resolvedTargets) {
      const upRaw = norm(await readFile(join(this.upstreamDir, rel), 'utf8'))
      const lRaw = norm(await readFile(join(this.localDir, rel), 'utf8'))
      const upB = splitBlocks(upRaw)
      const lB = splitBlocks(lRaw)
      const blocks = []

      diagnostics.push(`\n========== ${rel} ==========`)
      if (upB.length !== lB.length) diagnostics.push(`  块数不同: 上游 ${upB.length} / 本地 ${lB.length}`)

      const n = Math.max(upB.length, lB.length)
      for (let i = 0; i < n; i++) {
        const upstream = (upB[i]?.body ?? '').replace(/\n$/, '')
        const local = (lB[i]?.body ?? '').replace(/\n$/, '')
        if (upstream === local) continue

        blocks.push({
          index: i + 1,
          upstream,
          local,
          upstreamLang: upB[i]?.lang ?? '?',
          localLang: lB[i]?.lang ?? '?',
        })
        diagnostics.push(`\n--- 代码块 #${i + 1} (lang ${upB[i]?.lang ?? '?'} -> ${lB[i]?.lang ?? '?'}) ---`)
        const uLines = upstream.split('\n')
        const lLines = local.split('\n')
        const max = Math.max(uLines.length, lLines.length)
        for (let j = 0; j < max; j++) {
          const a = uLines[j] ?? '<缺>'
          const b = lLines[j] ?? '<缺>'
          if (a !== b) diagnostics.push(`  L${j + 1} 上游: ${a.slice(0, 150)}\n      本地: ${b.slice(0, 150)}`)
        }
      }
      files.push({ path: rel, upstreamBlocks: upB.length, localBlocks: lB.length, blocks })
    }

    return { ok: true, files, diagnostics }
  }
}