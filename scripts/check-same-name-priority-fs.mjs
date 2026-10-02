/**
 * 与官方 dsh-skill-filesystem 的同层同名实测：
 * 在同一个 SkillRegistry 内同时注册本包 provider 与官方 filesystem provider，
 * 验证 rank 裁决（本包 rank 10 < filesystem 自定义根 300 / 项目根 100-200 / 用户根 400-500 / bundled 600）。
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir, homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { check, freshRegistry, exitByFailed, assertPriorityArbitration } from './lib/harness-common.mjs'
import superpowers from '../lib/superpowers.js'

const OVERRIDDEN = 'brainstorming'
const UNTOUCHED = 'test-driven-development'

// 定位本地可用的 dsh-skill-filesystem
async function findFilesystemModule() {
  const candidates = [
    join(homedir(), '.dsh/profiles/web/node_modules/@deepseek-ai/dsh-skill-filesystem/lib/index.js'),
    join(homedir(), '.dsh/profiles/default/node_modules/@deepseek-ai/dsh-skill-filesystem/lib/index.js'),
  ]
  for (const c of candidates) {
    try {
      return await import(pathToFileURL(c).href)
    } catch {}
  }
  throw new Error('未在本机 DSH profiles 下找到 @deepseek-ai/dsh-skill-filesystem')
}

const fsModule = await findFilesystemModule()
const state = { failed: 0 }

// 创建临时 mock 目录
const mockDir = await mkdtemp(join(tmpdir(), 'dsh-fs-test-'))
try {
  const skillSubDir = join(mockDir, OVERRIDDEN)
  await mkdir(skillSubDir, { recursive: true })
  await writeFile(
    join(skillSubDir, 'SKILL.md'),
    `---\nname: ${OVERRIDDEN}\ndescription: filesystem version of ${OVERRIDDEN}\n---\n# ${OVERRIDDEN} from filesystem\n`,
    'utf8'
  )

  console.log('[check-priority-fs] 开始官方 filesystem 同名优先级实测...')

  await assertPriorityArbitration({
    state,
    suiteTitle: 'Filesystem 实测',
    registerTargetFirst: async (ctx) => {
      ctx.plugin(superpowers)
      ctx.plugin(fsModule, { providerName: 'filesystem', includeDefaultRoots: false, customSkillDirs: [mockDir], watch: false })
    },
    registerRivalFirst: async (ctx) => {
      ctx.plugin(fsModule, { providerName: 'filesystem', includeDefaultRoots: false, customSkillDirs: [mockDir], watch: false })
      ctx.plugin(superpowers)
    },
    overriddenSkill: OVERRIDDEN,
    untouchedSkill: UNTOUCHED,
    expectedWinnerProvider: 'superpowers',
  })
} finally {
  await rm(mockDir, { recursive: true, force: true }).catch(() => {})
}

exitByFailed('Filesystem 同名优先级实测', state)