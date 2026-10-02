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
//
// 该包可能来自三处，按「profile 优先、再全局」的顺序尝试：
//   1. profile 的 node_modules（npm 扁平布局，或 pnpm isolated 的符号链接入口）
//   2. pnpm store 内的 .pnpm 真实目录（isolated 布局下顶层可能是符号链接）
//   3. 全局 npm 安装的 dsh 本体自带（`npm i -g @deepseek-ai/dsh` 时的位置）
//
// 只写 profile 路径会在 pnpm isolated 布局下失效：该包并非 profile 的直接依赖，
// 只存在于 dsh 本体的依赖树中。
async function findFilesystemModule() {
  const rel = 'node_modules/@deepseek-ai/dsh-skill-filesystem/lib/index.js'
  const candidates = [
    // profile 布局：pnpm isolated 下这里是符号链接，import 可正常解析
    join(homedir(), '.dsh/profiles/web', rel),
    join(homedir(), '.dsh/profiles/default', rel),
    // pnpm isolated 真实目录：符号链接缺失时按包名目录匹配
    join(homedir(), '.dsh/profiles/web/node_modules/.pnpm/@deepseek-ai+dsh-skill-filesystem@0.2.0-rc.2/node_modules/@deepseek-ai/dsh-skill-filesystem/lib/index.js'),
    // 全局 dsh 本体自带
    join(homedir(), 'AppData/Roaming/npm/node_modules/@deepseek-ai/dsh', rel),
    join(homedir(), '.nvm/versions/node', '*/lib/node_modules/@deepseek-ai/dsh', rel),
  ]
  // pnpm isolated 下包目录名带 peer 后缀，用通配扫描兜底
  try {
    const { readdir } = await import('node:fs/promises')
    for (const profile of ['web', 'default']) {
      const pnpmDir = join(homedir(), `.dsh/profiles/${profile}/node_modules/.pnpm`)
      const entries = await readdir(pnpmDir).catch(() => [])
      for (const e of entries) {
        if (e.startsWith('@deepseek-ai+dsh-skill-filesystem@')) {
          candidates.push(join(pnpmDir, e, 'node_modules/@deepseek-ai/dsh-skill-filesystem/lib/index.js'))
        }
      }
    }
  } catch {}

  for (const c of candidates) {
    try {
      return await import(pathToFileURL(c).href)
    } catch {}
  }
  throw new Error(
    `未找到 @deepseek-ai/dsh-skill-filesystem，已尝试：\n` +
      candidates.map((c) => `  - ${c}`).join('\n') +
      `\n提示：若 dsh 通过 npm 全局安装，该包在其自带依赖树中；` +
      `也可先运行 \`npm i -g @deepseek-ai/dsh\`，或用桩对照脚本 ` +
      `\`node scripts/check-same-name-priority.mjs\` 完成等价验证。`,
  )
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