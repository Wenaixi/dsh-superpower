/**
 * 与官方 dsh-skill-filesystem 的同层同名实测：
 * 在同一个 SkillRegistry 内同时注册本包 provider 与官方 filesystem provider，
 * 验证 rank 裁决（本包 rank 10 < filesystem 自定义根 300 / 项目根 100-200 / 用户根 400-500 / bundled 600，
 * 同名时本包技能胜出，即本插件优先级最高）。
 *
 * 安全设计：
 * - 官方包从用户 profile 的 node_modules 扫描定位（便携，不写死本机路径）；
 * - 测试技能写在系统临时目录（mkdtemp），测完整棵删除，绝不触碰真实用户技能根与项目目录。
 *
 * 断言：
 * 1. 本包先注册、filesystem 后注册：同名 brainstorming 归 superpowers（优先级最高）。
 * 2. 注册顺序颠倒：结果不变（裁决只看 rank，与注册顺序无关）。
 * 3. 无同名覆盖：本包技能全部可见，总数 15。
 *
 * 依赖：本机任一 dsh profile 装有 @deepseek-ai/dsh-skill-filesystem。
 * 运行：node scripts/check-same-name-priority-fs.mjs
 */

import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir, homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { check, freshRegistry, exitByFailed } from './lib/harness-common.mjs'
import superpowers from '../lib/superpowers.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillDir = join(root, 'skills')
const OVERRIDDEN = 'brainstorming'
const UNTOUCHED = 'test-driven-development'

// 便携定位官方 filesystem 提供方：扫描 ~/.dsh/profiles/*/node_modules
async function resolveOfficialFilesystem() {
  const profilesRoot = join(homedir(), '.dsh', 'profiles')
  const profiles = await readdir(profilesRoot).catch(() => [])
  for (const name of profiles) {
    const p = join(profilesRoot, name, 'node_modules', '@deepseek-ai', 'dsh-skill-filesystem', 'lib', 'index.js')
    if (await stat(p).then(() => true).catch(() => false)) return p
  }
  return undefined
}

const officialPath = await resolveOfficialFilesystem()
if (officialPath === undefined) {
  console.error('FAIL  未找到官方 @deepseek-ai/dsh-skill-filesystem（请先在本机任一 dsh profile 安装它）')
  process.exit(1)
}
const fsMod = await import(pathToFileURL(officialPath).href)

const state = { failed: 0 }

// 在临时根下写一个与上游同构的最小同名技能（rank 裁决只看 name，不看正文）
async function writeOverride(skillRoot) {
  const dir = join(skillRoot, OVERRIDDEN)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'),
    `---\nname: ${OVERRIDDEN}\ndescription: "filesystem 根里的同名技能，用于验证本包优先级最高。"\n---\n\nfilesystem 覆盖内容。\n`, 'utf8')
  return dir
}

// 官方 filesystem 提供方（includeDefaultRoots: false + customSkillDirs 指向被测临时根）
function mountFilesystem(ctx, dirs) {
  ctx.plugin(fsMod, { providerName: 'filesystem', includeDefaultRoots: false, customSkillDirs: dirs, watch: false })
}

// --- 1. 本包先注册，filesystem 后注册；自定义根（rank 300）同名，本包仍胜出 ----------------
{
  const ctx = await freshRegistry()
  ctx.plugin(superpowers, { providerName: 'superpowers', skillDir })
  const tmp = await mkdtemp(join(tmpdir(), 'sp-fs-'))
  const customRoot = join(tmp, 'custom-skills')
  await mkdir(customRoot, { recursive: true })
  await writeOverride(customRoot)
  mountFilesystem(ctx, [customRoot])
  const all = await ctx.skills.list({ cwd: root })
  const hit = all.find((s) => s.name === OVERRIDDEN)
  check(state, '自定义根同名：brainstorming 仍归本包', hit?.provider, 'superpowers')
  check(state, '自定义根同名：不产生重名条目', all.filter((s) => s.name === OVERRIDDEN).length, 1)
  check(state, '自定义根同名后总数仍为 15', all.length, 15)
  check(state, '逐名裁决：未被覆盖的技能仍在', all.find((s) => s.name === UNTOUCHED)?.provider, 'superpowers')
  await rm(tmp, { recursive: true, force: true })
}

// --- 2. filesystem 先注册，本包后注册；注册顺序颠倒结果不变 ----------------
{
  const ctx = await freshRegistry()
  const tmp = await mkdtemp(join(tmpdir(), 'sp-fs-'))
  const customRoot = join(tmp, 'custom-skills')
  await mkdir(customRoot, { recursive: true })
  await writeOverride(customRoot)
  mountFilesystem(ctx, [customRoot])
  ctx.plugin(superpowers, { providerName: 'superpowers', skillDir })
  const all = await ctx.skills.list({ cwd: root })
  const hit = all.find((s) => s.name === OVERRIDDEN)
  check(state, '注册顺序颠倒：brainstorming 仍归本包', hit?.provider, 'superpowers')
  check(state, '注册顺序颠倒：总数仍为 15', all.length, 15)
  await rm(tmp, { recursive: true, force: true })
}

// --- 3. 无同名覆盖基线：全部归本包 ----------------
{
  const ctx = await freshRegistry()
  ctx.plugin(superpowers, { providerName: 'superpowers', skillDir })
  mountFilesystem(ctx, [])
  const all = await ctx.skills.list({ cwd: root })
  check(state, '无同名覆盖：brainstorming 归属', all.find((s) => s.name === OVERRIDDEN)?.provider, 'superpowers')
  check(state, '无同名覆盖：技能总数', all.length, 15)
}

exitByFailed('与官方 filesystem 同层同名实测', state)
