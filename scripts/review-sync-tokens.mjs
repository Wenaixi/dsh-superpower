/**
 * 代码块 token 级校验：确保命令、参数、路径、环境变量、占位符在本地化后仍逐字保留。
 * 委托 SyncEngine 深度模块执行。
 *
 * 用法：$env:SP_UPSTREAM = <上游 skills>; node scripts/review-sync-tokens.mjs
 */
import { SyncEngine } from './lib/sync-engine.mjs'

const engine = new SyncEngine()
const result = await engine.reviewTokens()
if (!result.ok) process.exit(1)
