/**
 * @wenaixi/dsh-superpower — 上游同步复核统一命令行调度器
 *
 * 统一调度：
 * - deep: 深度结构与 markdown 块差异比对
 * - tokens: Token 级无损覆盖核对
 * - fences: 代码块并排差异排查
 * - all (默认): 连续执行 deep 与 tokens 双重核查，全部通过才 exit 0
 *
 * 用法：
 *   node scripts/review-sync.mjs [deep|tokens|fences|all] [options]
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SyncEngine } from './lib/sync-engine.mjs'

const engine = new SyncEngine(process.env.SP_UPSTREAM)

export async function runReviewSync(argv = process.argv.slice(2)) {
  const modeArg = argv[0] || 'all'
  const mode = modeArg.replace(/^--mode=/, '').toLowerCase()

  if (mode === 'help' || mode === '--help' || mode === '-h') {
    console.log(`
用法: node scripts/review-sync.mjs [mode] [args...]

可用模式:
  all     (默认) 连续执行 deep 与 tokens 双重核查
  deep    深度结构与 Markdown 块差异比对
  tokens  Token 级敏感词与契约覆盖比对
  fences  代码块并排差异检查 (可选附带技能名)
  help    显示本帮助信息

环境变量:
  SP_UPSTREAM 上游 obra/superpowers 的 skills/ 目录路径
`)
    return 0
  }

  if (mode === 'deep') {
    const res = await engine.reviewDeep()
    for (const line of res?.diagnostics ?? []) console.log(line)
    return res?.ok ? 0 : 1
  }

  if (mode === 'tokens') {
    const res = await engine.reviewTokens()
    for (const line of res?.diagnostics ?? []) console.log(line)
    return res?.ok ? 0 : 1
  }

  if (mode === 'fences') {
    const extraArgs = argv.slice(1)
    const res = await engine.reviewFences(extraArgs)
    for (const line of res?.diagnostics ?? []) console.log(line)
    return res?.ok ? 0 : 1
  }

  if (mode === 'all') {
    console.log('[review-sync] 正在启动全量同步复核 (deep + tokens)...\n')
    console.log('--- 阶段 1/2: 深度结构比对 (deep) ---')
    const deepRes = await engine.reviewDeep()
    for (const line of deepRes?.diagnostics ?? []) console.log(line)
    const deepOk = deepRes?.ok
    if (!deepOk) {
      console.error(`\n[review-sync] deep 阶段未通过 (fails: ${deepRes?.fails ?? 'unknown'})\n`)
      return 1
    }

    console.log('\n--- 阶段 2/2: Token 级无损比对 (tokens) ---')
    const tokensRes = await engine.reviewTokens()
    for (const line of tokensRes?.diagnostics ?? []) console.log(line)
    const tokensOk = tokensRes?.ok
    if (!tokensOk) {
      console.error(`\n[review-sync] tokens 阶段未通过 (issues: ${tokensRes?.issues?.length ?? 'unknown'})\n`)
      return 1
    }

    console.log('\n[review-sync] 全量同步复核全部通过 -> PASS\n')
    return 0
  }

  console.error(`[review-sync] 未知模式: "${modeArg}", 请使用 deep | tokens | fences | all`)
  return 1
}

// 直接以 CLI 运行时调度退出
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const exitCode = await runReviewSync()
  process.exit(exitCode)
}
