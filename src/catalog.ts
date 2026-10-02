/**
 * @wenaixi/dsh-superpower — SkillCatalog 深度模块
 *
 * 封装技能目录的发现、遍历、健康探测、排重、名称漂移校验与版本化快照索引。
 *
 * 核心设计：
 * - Depth: 将文件系统遍历、mtime 存活检测、去重、状态回写与快照复用隐藏在极简接口之后；
 * - Locality: 集中管理技能目录发现逻辑、缓存一致性与规范合规规则；
 * - Leverage: 同时支撑 SuperpowersProvider 高性能运行时与 verify.mjs 质检治理。
 */

import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SkillCandidate, SkillDefinition } from '@deepseek-ai/dsh-skill'
import { SkillDocument, type SpecificationTestResult } from './document.js'
import { SkillSwitches } from './switches.js'

export interface CatalogLogger {
  warn(msg: string): void
  debug?(msg: string): void
  info?(msg: string): void
}

export interface CatalogLookupOptions {
  signal?: AbortSignal
  logger?: CatalogLogger
  forceScan?: boolean
}

export interface CatalogEntry {
  directoryName: string
  skillPath: string
  document: SkillDocument
  nameDrift: boolean
}

export interface SpecificationReport {
  total: number
  passed: number
  failed: number
  results: SpecificationTestResult[]
  ok: boolean
}

export interface CatalogIntegrityReport {
  total: number
  entries: CatalogEntry[]
  duplicates: string[]
  missingSkillMd: string[]
  errors: { path: string; error: string }[]
  ok: boolean
}

export class SkillCatalog {
  readonly skillDir: string
  private readonly entriesByName = new Map<string, CatalogEntry>()
  private readonly entriesByDir = new Map<string, CatalogEntry>()
  private readonly duplicates: string[] = []
  private readonly missingSkillMd: string[] = []
  private readonly loadErrors: { path: string; error: string }[] = []

  // 快照缓存与版本探测状态
  private cachedCandidates: readonly SkillCandidate[] | null = null
  private lastScannedMtimeMs = 0
  private lastScanProviderName?: string
  private lastScanRank?: number

  constructor(skillDir: string) {
    this.skillDir = skillDir
  }

  /**
   * 从指定目录异步扫描并构建已预热的 SkillCatalog 深度实例。
   */
  static async fromDirectory(skillDir: string, options?: CatalogLookupOptions): Promise<SkillCatalog> {
    options?.signal?.throwIfAborted()
    const catalog = new SkillCatalog(skillDir)
    await catalog.scan(options)
    return catalog
  }

  /**
   * 清空快照与索引，强制下一轮查询重新从磁盘装载。
   */
  invalidate(): void {
    this.cachedCandidates = null
    this.lastScannedMtimeMs = 0
    this.entriesByName.clear()
    this.entriesByDir.clear()
    this.duplicates.length = 0
    this.missingSkillMd.length = 0
    this.loadErrors.length = 0
  }

  /**
   * 探测目录是否发生变动。
   */
  private async isDirModified(signal?: AbortSignal): Promise<boolean> {
    if (this.lastScannedMtimeMs === 0 || this.entriesByName.size === 0) return true
    try {
      signal?.throwIfAborted()
      const dirStat = await stat(this.skillDir)
      return dirStat.mtimeMs > this.lastScannedMtimeMs
    } catch {
      return true
    }
  }

  /**
   * 执行全量目录遍历与技能索引构建。
   */
  async scan(options?: CatalogLookupOptions): Promise<void> {
    const signal = options?.signal
    const logger = options?.logger

    let dirStat: import('node:fs').Stats | undefined
    try {
      dirStat = await stat(this.skillDir)
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        logger?.warn(`[SkillCatalog] skillDir not found: ${this.skillDir}`)
        this.invalidate()
        return
      }
      throw err
    }

    let dirents: import('node:fs').Dirent[]
    try {
      dirents = await (readdir as unknown as (p: string, o: Record<string, unknown>) => Promise<import('node:fs').Dirent[]>)(
        this.skillDir,
        { withFileTypes: true, signal } as unknown as Record<string, unknown>,
      )
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        logger?.warn(`[SkillCatalog] skillDir not found: ${this.skillDir}`)
        this.invalidate()
        return
      }
      throw err
    }

    // 重置内存临时状态
    this.entriesByName.clear()
    this.entriesByDir.clear()
    this.duplicates.length = 0
    this.missingSkillMd.length = 0
    this.loadErrors.length = 0
    this.cachedCandidates = null

    const sorted = dirents.filter((e) => e.isDirectory() && !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of sorted) {
      signal?.throwIfAborted()
      const skillPath = join(this.skillDir, entry.name, 'SKILL.md')

      try {
        await stat(skillPath)
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException)?.code
        logger?.debug?.(`[SkillCatalog] skip ${entry.name}: no SKILL.md (${code ?? String(err)})`)
        this.missingSkillMd.push(entry.name)
        continue
      }

      let doc: SkillDocument
      try {
        doc = await SkillDocument.fromFile(skillPath, signal)
      } catch (err: unknown) {
        const msg = String((err as Error)?.message ?? err)
        logger?.warn(`[SkillCatalog] skip ${skillPath}: parse failed — ${msg}`)
        this.loadErrors.push({ path: skillPath, error: msg })
        continue
      }

      if (this.entriesByName.has(doc.name)) {
        logger?.warn(`[SkillCatalog] skip ${skillPath}: duplicate skill name "${doc.name}"`)
        this.duplicates.push(doc.name)
        continue
      }

      const nameDrift = doc.name !== entry.name
      if (nameDrift) {
        logger?.warn(`[SkillCatalog] skill name "${doc.name}" != directory "${entry.name}" (using frontmatter)`)
      }

      const catalogEntry: CatalogEntry = {
        directoryName: entry.name,
        skillPath,
        document: doc,
        nameDrift,
      }

      this.entriesByName.set(doc.name, catalogEntry)
      this.entriesByDir.set(entry.name, catalogEntry)
    }

    this.lastScannedMtimeMs = dirStat.mtimeMs
  }

  /**
   * 映射当前有效技能为 DSH SkillCandidate 快照。
   * 自动按 mtime 评估有效性，未变动时直接复用不可变快照，零重复读盘。
   */
  async listCandidates(providerName: string, rank: number, options?: CatalogLookupOptions): Promise<readonly SkillCandidate[]> {
    options?.signal?.throwIfAborted()

    const needsScan =
      options?.forceScan ||
      this.cachedCandidates === null ||
      this.lastScanProviderName !== providerName ||
      this.lastScanRank !== rank ||
      (await this.isDirModified(options?.signal))

    if (needsScan) {
      await this.scan(options)
      const list: SkillCandidate[] = []
      for (const entry of this.entriesByName.values()) {
        list.push(entry.document.toCandidate(providerName, rank))
      }
      this.cachedCandidates = Object.freeze(list)
      this.lastScanProviderName = providerName
      this.lastScanRank = rank
    }

    return this.cachedCandidates!
  }

  /**
   * 根据候选技能的 locator 与名称解析出完整 SkillDefinition。
   * 优先命中内存缓存；若发生热重读，自动自愈更新回内存映射，消除状态撕裂缝隙。
   */
  async getDefinition(candidate: SkillCandidate, providerName: string, options?: CatalogLookupOptions): Promise<SkillDefinition | undefined> {
    options?.signal?.throwIfAborted()
    const locator = candidate.locator as { path: string; directory: string } | undefined
    if (!locator?.path) return undefined

    // 优先命中内存缓存
    const cached = this.entriesByName.get(candidate.name)
    if (cached && cached.skillPath === locator.path) {
      return cached.document.toDefinition(providerName)
    }

    // 若缓存未命中则重新从文件读取
    let doc: SkillDocument
    try {
      doc = await SkillDocument.fromFile(locator.path, options?.signal)
    } catch (err: unknown) {
      if ((err as DOMException)?.name === 'AbortError') throw err
      const code = (err as NodeJS.ErrnoException)?.code
      if (code === 'ENOENT') return undefined
      options?.logger?.warn(`[SkillCatalog] get ${candidate.name}: read failed (${code ?? String(err)})`)
      return undefined
    }

    if (doc.name !== candidate.name) {
      options?.logger?.warn(`[SkillCatalog] get ${candidate.name}: name drift "${doc.name}" != "${candidate.name}"`)
      return undefined
    }

    // 自愈回写：将重新读取解析出的文档更新进内部索引，保持状态严格一致
    const dirName = cached?.directoryName ?? candidate.name
    const updatedEntry: CatalogEntry = {
      directoryName: dirName,
      skillPath: locator.path,
      document: doc,
      nameDrift: doc.name !== dirName,
    }
    this.entriesByName.set(doc.name, updatedEntry)
    this.entriesByDir.set(dirName, updatedEntry)
    this.cachedCandidates = null // 快照失效，以便下一轮刷新

    return doc.toDefinition(providerName)
  }

  /**
   * 执行 SkillCatalog 自身边界契约自检（排重与漂移探测）。
   */
  static async selfTest(): Promise<SpecificationTestResult[]> {
    const results: SpecificationTestResult[] = []
    const runCheck = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn()
        results.push({ name, ok: true })
      } catch (err: unknown) {
        results.push({ name, ok: false, error: (err as Error)?.message ?? String(err) })
      }
    }

    await runCheck('目录排重', async () => {
      const base = await mkdtemp(join(tmpdir(), 'sp-dup-'))
      try {
        const md = '---\nname: same-name\ndescription: d\n---\nbody'
        await mkdir(join(base, 'alpha'))
        await mkdir(join(base, 'bravo'))
        await Promise.all([writeFile(join(base, 'alpha', 'SKILL.md'), md), writeFile(join(base, 'bravo', 'SKILL.md'), md)])
        const cat = await SkillCatalog.fromDirectory(base)
        if (cat.verifyIntegrity().duplicates.length !== 1) throw new Error('duplicates != 1')
      } finally {
        await rm(base, { recursive: true, force: true }).catch(() => {})
      }
    })

    await runCheck('name drift', async () => {
      const base = await mkdtemp(join(tmpdir(), 'sp-drift-'))
      try {
        await mkdir(join(base, 'dir-name'))
        await writeFile(join(base, 'dir-name', 'SKILL.md'), '---\nname: other-name\ndescription: d\n---\nbody')
        const cat = await SkillCatalog.fromDirectory(base)
        if (!cat.verifyIntegrity().entries[0]?.nameDrift) throw new Error('nameDrift 未生效')
      } finally {
        await rm(base, { recursive: true, force: true }).catch(() => {})
      }
    })

    return results
  }

  /**
   * 执行完整的核心规范测试套件，返回聚合体检报告（测试表面即接口）。
   */
  static async verifySpecification(): Promise<SpecificationReport> {
    const [docResults, catResults, switchResults] = await Promise.all([
      SkillDocument.selfTest(),
      SkillCatalog.selfTest(),
      SkillSwitches.selfTest(),
    ])
    const results = [...docResults, ...catResults, ...switchResults]
    const passed = results.filter((r) => r.ok).length
    const failed = results.length - passed
    return {
      total: results.length,
      passed,
      failed,
      results,
      ok: failed === 0,
    }
  }

  /**
   * 生成目录健康度与一致性完整体检报告（供 verify 脚本与 CI 质量门禁复用）。
   */
  verifyIntegrity(): CatalogIntegrityReport {
    const entries = Array.from(this.entriesByName.values())
    const ok = this.duplicates.length === 0 && this.loadErrors.length === 0 && entries.every((e) => !e.nameDrift)
    return {
      total: entries.length,
      entries,
      duplicates: [...this.duplicates],
      missingSkillMd: [...this.missingSkillMd],
      errors: [...this.loadErrors],
      ok,
    }
  }
}