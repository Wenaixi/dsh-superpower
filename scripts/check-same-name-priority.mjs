/**
 * 与自研桩的同层同名实测：
 * 在同一个 SkillRegistry 内同时注册本包 provider 与 rival provider (rank 600)，
 * 验证 rank 裁决（本包 rank 10 < rival 600，同名时本包技能胜出）。
 */

import { check, freshRegistry, exitByFailed, assertPriorityArbitration } from './lib/harness-common.mjs'
import superpowers from '../lib/superpowers.js'

const OVERRIDDEN = 'brainstorming'
const UNTOUCHED = 'test-driven-development'

function createRivalProvider(name, rank, skillNames) {
  return {
    name,
    async list() {
      return skillNames.map((n) => ({
        name: n,
        description: `${name} version of ${n}`,
        source: 'bundled',
        provider: name,
        rank,
      }))
    },
    async get(candidate) {
      return {
        name: candidate.name,
        description: candidate.description,
        source: 'bundled',
        provider: name,
        content: `# ${candidate.name} from ${name}`,
      }
    },
  }
}

const state = { failed: 0 }
console.log('[check-priority] 开始自研桩同名优先级实测...')

await assertPriorityArbitration({
  state,
  suiteTitle: 'Mock 对照',
  registerTargetFirst: async (ctx) => {
    ctx.plugin(superpowers)
    ctx.skills.registerProvider(() => createRivalProvider('bundled-skills', 600, [OVERRIDDEN]))
  },
  registerRivalFirst: async (ctx) => {
    ctx.skills.registerProvider(() => createRivalProvider('bundled-skills', 600, [OVERRIDDEN]))
    ctx.plugin(superpowers)
  },
  overriddenSkill: OVERRIDDEN,
  untouchedSkill: UNTOUCHED,
  expectedWinnerProvider: 'superpowers',
})

exitByFailed('Mock 对照优先级实测', state)
