/**
 * @wenaixi/dsh-superpower — 客户端静态清单漂移校验器
 *
 * 封装「src/client.js 内联的 SKILL_CATALOG 与 skills/ 目录是否一致」的判定。
 *
 * 为什么需要它：客户端面板必须知道本包有哪些技能才能画出 15 行，但它在浏览器里
 * 读不到 skills/ 目录，只能内联一份清单。清单一旦与磁盘漂移，UI 会画出磁盘上不
 * 存在的行，而模型侧拿到的是真实清单，两者矛盾且用户无从察觉。
 *
 * 校验而非生成：生成会让 UI 依赖构建链并引入第二条产物路径；把比对放进构建门禁
 * 则以最小代价守住「skills/ 是唯一事实来源」这条不变式。
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SkillCatalog } from '../../lib/superpowers.js'

const CATALOG_MARKER = 'const SKILL_CATALOG ='

/**
 * 从 src/client.js 源码中提取 SKILL_CATALOG 数组字面量并求值。
 *
 * 提取不靠手写括号配平：SKILL_CATALOG 是模块级 const 声明，数组在同一条
 * 语句内闭合；取声明后第一个 ']' 作为朴素边界，再用 new Function 求值并
 * 断言 Array.isArray——求值失败即报错，任何边界误判都会在此暴露。
 * 手写配平版本的单引号分支（char === ''）缺陷使字符串内方括号参与配平，
 * 当前数据恰好无方括号而幸存，属于零守卫的隐藏陷阱，故移除。
 *
 * @param {string} source - src/client.js 全文
 * @returns {{ skills: Array } | { error: string }}
 */
function extractCatalogLiteral(source) {
  const markerIndex = source.indexOf(CATALOG_MARKER)
  if (markerIndex < 0) return { error: 'src/client.js 中未找到 SKILL_CATALOG 声明' }

  const arrayStart = source.indexOf('[', markerIndex)
  if (arrayStart < 0) return { error: 'SKILL_CATALOG 声明后未找到数组字面量起始符' }

  // 朴素边界：同一条声明语句内的首个 ']'。求值失败即判定不配平。
  const arrayEnd = source.indexOf(']', arrayStart)
  if (arrayEnd < 0) return { error: 'SKILL_CATALOG 数组字面量未闭合' }

  const literal = source.slice(arrayStart, arrayEnd + 1)
  try {
    const skills = new Function('return ' + literal)()
    if (!Array.isArray(skills)) return { error: 'SKILL_CATALOG 求值结果不是数组' }
    return { skills }
  } catch (error) {
    return { error: 'SKILL_CATALOG 字面量无法解析：' + (error?.message ?? String(error)) }
  }
}

/**
 * 比对客户端内联清单与 skills/ 目录的真实编目。
 *
 * @param {string} rootDir - 仓库根目录
 * @returns {Promise<{ skills: Array, issues: string[] }>}
 *   skills 为磁盘上的真实清单；issues 为空表示两侧一致
 */
export async function assertClientManifest(rootDir) {
  const actual = await readDiskCatalog(rootDir)

  let source
  try {
    source = await readFile(join(rootDir, 'src', 'client.js'), 'utf8')
  } catch (error) {
    return { skills: actual, issues: ['src/client.js 读取失败：' + (error?.message ?? String(error))] }
  }

  let artifact
  try {
    artifact = await readFile(join(rootDir, 'lib', 'client.js'), 'utf8')
  } catch (error) {
    return { skills: actual, issues: ['lib/client.js 读取失败：' + (error?.message ?? String(error))] }
  }

  const issues = []
  if (source !== artifact) {
    issues.push('src/client.js 与 lib/client.js 不一致，请重新构建客户端产物')
  }

  return { skills: actual, issues: issues.concat(await checkSkillCatalogDrift(rootDir)) }
}

/**
 * 比对内联清单与 skills/ 目录的真实编目。
 *
 * 与 assertClientManifest 分开是必要的分工：前者是门禁，负责「产物同步 + 清单不漂移」
 * 一起判；后者只管清单漂移，构建脚本在复制产物之前用它。把产物同步塞进构建的前置
 * 条件会形成死锁——产物旧了就拒绝执行，于是永远无法重建。
 *
 * @param {string} rootDir - 仓库根目录
 * @returns {Promise<string[]>} issues 为空表示两侧一致
 */
export async function checkSkillCatalogDrift(rootDir) {
  const actual = await readDiskCatalog(rootDir)

  let source
  try {
    source = await readFile(join(rootDir, 'src', 'client.js'), 'utf8')
  } catch (error) {
    return ['src/client.js 读取失败：' + (error?.message ?? String(error))]
  }

  const extracted = extractCatalogLiteral(source)
  if ('error' in extracted) return [extracted.error]
  const declared = extracted.skills

  const issues = []
  if (declared.length !== actual.length) {
    issues.push('技能数量不一致：skills/ 目录 ' + actual.length + ' 个，客户端内联 ' + declared.length + ' 个')
  }

  // 按 name 建 Map 比对，顺序无关：清单与磁盘的先后差异不报错，
  // 只报真实的内容差异（缺技能 / 多技能 / 描述漂移）。
  const diskByName = new Map(actual.map((skill) => [skill.name, skill]))
  const declaredNames = new Set(declared.map((skill) => skill.name))

  for (const name of declaredNames) {
    const disk = diskByName.get(name)
    if (!disk) {
      issues.push('客户端清单多出技能 ' + name + '，skills/ 目录中不存在')
      continue
    }
    const client = declared.find((skill) => skill.name === name)
    if (client && client.description !== disk.description) {
      issues.push('技能 ' + name + ' 的中文描述与 SKILL.md 不一致，请同步客户端内联清单')
    }
    if (client && (client.descriptionEn ?? '') !== disk.descriptionEn) {
      issues.push('技能 ' + name + ' 的英文描述与 SKILL.en.md 不一致，请同步客户端内联清单')
    }
  }
  for (const name of diskByName.keys()) {
    if (!declaredNames.has(name)) {
      issues.push('客户端清单缺少技能 ' + name)
    }
  }

  return issues
}

/**
 * 读 skills/ 目录的真实编目。
 *
 * @param {string} rootDir - 仓库根目录
 * @returns {Promise<Array<{ name: string, description: string }>>}
 */
async function readDiskCatalog(rootDir) {
  const catalog = await SkillCatalog.fromDirectory(join(rootDir, 'skills'))
  return catalog.verifyIntegrity().entries.map((entry) => ({
    name: entry.document.name,
    description: entry.document.description,
    descriptionEn: entry.enDocument?.description ?? '',
  }))
}
