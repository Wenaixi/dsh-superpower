/**
 * @wenaixi/dsh-superpower — 上游 Token 比对入口 (代理至 review-sync.mjs)
 */
import { runReviewSync } from './review-sync.mjs'

const code = await runReviewSync(['tokens', ...process.argv.slice(2)])
process.exit(code)
