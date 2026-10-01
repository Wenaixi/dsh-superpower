/**
 * 本地 skills/ 与上游 v6.4.2 的同步一致性最终复核（v7.0.0 发版前必跑）。
 * 口径 = CLAUDE.md 中文化契约。
 * 委托 SyncEngine 深度模块执行。
 *
 * 用法：$env:SP_UPSTREAM = <上游 skills 目录>; node scripts/review-sync-deep.mjs
 */
import { SyncEngine } from './lib/sync-engine.mjs'

const engine = new SyncEngine()
const result = await engine.reviewDeep()
if (!result.ok) process.exit(1)
