/**
 * @wenaixi/dsh-superpower — 上游深度同步复核入口 (代理至 review-sync.mjs)
 */
import { runReviewSync } from './review-sync.mjs'

const code = await runReviewSync(['deep', ...process.argv.slice(2)])
process.exit(code)
