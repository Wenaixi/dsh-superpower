/**
 * 插件技能优先级实测：用真实 SkillRegistry + 真实插件，验证 rank 10 让本包技能优先级最高。
 *
 * 断言：
 * 1. 仅有本包时，brainstorming 归 superpowers。
 * 2. 叠加 rank 100/300/500/600（filesystem 项目根/自定义根/用户根/官方 bundled）的同名 provider，
 *    brainstorming 仍归 superpowers（本包在全部官方档位之上胜出）。
 * 3. rank 0（比本包更小）的同名 provider 才可抢走；此时其余技能仍归本包（逐名裁决）。
 *
 * 运行：node scripts/check-same-name-priority.mjs
 */

import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import superpowers from '../lib/superpowers.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillDir = join(root, 'skills')
const OVERRIDDEN = 'brainstorming'
const UNTOUCHED = 'test-driven-development'

let failed = 0
function check(label, actual, expected) {
  const ok = actual === expected
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${actual}${ok ? '' : ` (期望 ${expected})`}`)
}

/** 模拟同名的其他来源 provider：只暴露一个与上游同名的技能，rank 由参数指定。 */
function stubRivalProvider(rank, source = 'user') {
  const path = join(skillDir, OVERRIDDEN, 'SKILL.md')
  return {
    name: `rival-${rank}`,
    async list() {
      return [
        {
          name: OVERRIDDEN,
          description: '其他来源的同名技能。',
          invocation: { modelInvocable: true, userInvocable: true },
          source,
          provider: `rival-${rank}`,
          rank,
          locator: { path },
          resourceBase: { kind: 'directory', path: dirname(path) },
          path,
        },
      ]
    },
    async get(candidate) {
      return {
        name: candidate.name,
        description: candidate.description,
        invocation: candidate.invocation,
        source: candidate.source,
        provider: candidate.provider,
        resourceBase: candidate.resourceBase,
        path: candidate.path,
        content: await readFile(candidate.locator.path, 'utf8'),
      }
    },
  }
}

async function freshRegistry() {
  const ctx = new Context()
  await ctx.plugin(SkillRegistry)
  return ctx
}

// --- 1. 只有本包 ---------------------------------------------------------
{
  const ctx = await freshRegistry()
  ctx.plugin(superpowers, { providerName: 'superpowers', skillDir })
  const all = await ctx.skills.list({ cwd: root })
  check('仅有本包：技能总数', all.length, 15)
  check('仅有本包：brainstorming 归属', all.find((s) => s.name === OVERRIDDEN)?.provider, 'superpowers')
}

// --- 2. 各档位其他来源同名技能均不得抢走（100/300/500/600 < 900）----------
for (const rank of [100, 300, 500, 600]) {
  const ctx = await freshRegistry()
  ctx.plugin(superpowers, { providerName: 'superpowers', skillDir })
  ctx.skills.registerProvider(() => stubRivalProvider(rank, rank === 600 ? 'bundled' : 'user'))
  const all = await ctx.skills.list({ cwd: root })
  const hit = all.find((s) => s.name === OVERRIDDEN)
  check(`其他来源 rank ${rank}：本包胜出`, hit?.provider, 'superpowers')
  check(`其他来源 rank ${rank}：不产生重名条目`, all.filter((s) => s.name === OVERRIDDEN).length, 1)
  check(`其他来源 rank ${rank}：总数仍为 15`, all.length, 15)
}

// --- 3. rank 小于本包（如 0）才可抢走；其余技能仍归本包（逐名裁决）---------
{
  const ctx = await freshRegistry()
  ctx.plugin(superpowers, { providerName: 'superpowers', skillDir })
  ctx.skills.registerProvider(() => stubRivalProvider(0))
  const all = await ctx.skills.list({ cwd: root })
  check('rank 0 小于 10：其他来源胜出', all.find((s) => s.name === OVERRIDDEN)?.provider, 'rival-0')
  check('逐名裁决：未被覆盖的技能仍在', all.find((s) => s.name === UNTOUCHED)?.provider, 'superpowers')
}

console.log(failed === 0 ? '\n插件优先级实测：全部通过' : `\n插件优先级实测：${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
