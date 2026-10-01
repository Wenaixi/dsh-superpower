/**
 * 深挖：逐块打印本地与上游不一致的 fenced code block 内容。
 * 委托 SyncEngine 深度模块执行。
 *
 * 用法：node scripts/review-sync-fences.mjs <相对路径...>（不给参数则打印全部不一致块）
 */
import { SyncEngine } from './lib/sync-engine.mjs'

const targets = process.argv.slice(2)
const engine = new SyncEngine()
await engine.reviewFences(targets.length > 0 ? targets : undefined)
