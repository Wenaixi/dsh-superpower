/**
 * 同名优先实测：用真实 SkillRegistry + 真实插件，验证 rank 550 让用户/项目同名技能胜出。
 *
 * 断言：
 * 1. 仅有本包时，brainstorming 归 superpowers（rank 550）。
 * 2. 叠加一个 rank 100 的「用户目录」provider（同名）后，brainstorming 归 filesystem 桩。
 * 3. 其他未被覆盖的技能仍归 superpowers（逐名裁决，不是整体遮蔽）。
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

/** 模拟 @deepseek-ai/dsh-skill-filesystem 的用户根：rank 100，只暴露一个同名技能。 */
function stubUserProvider(rank) {
  const path = join(skillDir, OVERRIDDEN, 'SKILL.md')
  return {
    name: 'filesystem',
    async list() {
      return [
        {
          name: OVERRIDDEN,
          description: '用户自装的同名技能，应当压过本包。',
          invocation: { modelInvocable: true, userInvocable: true },
          source: 'user',
          provider: 'filesystem',
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
        source: 'user',
        provider: 'filesystem',
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

// --- 2. 叠加用户同名技能（rank 100 < 550）-------------------------------
{
  const ctx = await freshRegistry()
  ctx.plugin(superpowers, { providerName: 'superpowers', skillDir })
  ctx.skills.registerProvider(() => stubUserProvider(100))
  const all = await ctx.skills.list({ cwd: root })
  const hit = all.find((s) => s.name === OVERRIDDEN)
  check('同名覆盖：brainstorming 归属', hit?.provider, 'filesystem')
  check('同名覆盖：brainstorming source', hit?.source, 'user')
  check('同名覆盖：不产生重名条目', all.filter((s) => s.name === OVERRIDDEN).length, 1)
  check('同名覆盖后技能总数仍为 15', all.length, 15)
  check('逐名裁决：未被覆盖的技能仍在', all.find((s) => s.name === UNTOUCHED)?.provider, 'superpowers')
}

// --- 3. rank 高于本包的 provider 不应抢走 ------------------------------
{
  const ctx = await freshRegistry()
  ctx.plugin(superpowers, { providerName: 'superpowers', skillDir })
  ctx.skills.registerProvider(() => stubUserProvider(700))
  const hit = (await ctx.skills.list({ cwd: root })).find((s) => s.name === OVERRIDDEN)
  check('rank 700 高于 550：本包胜出', hit?.provider, 'superpowers')
}

console.log(failed === 0 ? '\n同名优先实测：全部通过' : `\n同名优先实测：${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
