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
const BACKSLASH = 92
const BACKTICK = 96

/**
 * 从 src/client.js 源码中提取 SKILL_CATALOG 数组字面量。
 *
 * @param {string} source - src/client.js 全文
 * @returns {{ skills: Array } | { error: string }}
 */
function extractCatalogLiteral(source) {
  const markerIndex = source.indexOf(CATALOG_MARKER)
  if (markerIndex < 0) return { error: 'src/client.js 中未找到 SKILL_CATALOG 声明' }

  const arrayStart = source.indexOf('[', markerIndex)
  if (arrayStart < 0) return { error: 'SKILL_CATALOG 声明后未找到数组字面量起始符' }

  // 括号配平扫描：字符串字面量内的方括号不参与配平
  let depth = 0
  let quote = ''
  let arrayEnd = -1
  for (let i = arrayStart; i < source.length; i++) {
    const char = source[i]
    if (quote !== '') {
      if (source.charCodeAt(i) === BACKSLASH) i++
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === '' || char.charCodeAt(0) === BACKTICK) {
      quote = char
      continue
    }
    if (char === '[') depth++
    else if (char === ']') {
      depth--
      if (depth === 0) {
        arrayEnd = i
        break
      }
    }
  }
  if (arrayEnd < 0) return { error: 'SKILL_CATALOG 数组字面量括号不配平' }

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
  const catalog = await SkillCatalog.fromDirectory(join(rootDir, 'skills'))
  const actual = catalog.verifyIntegrity().entries.map((entry) => ({
    name: entry.document.name,
    description: entry.document.description,
  }))

  let source
  try {
    source = await readFile(join(rootDir, 'src', 'client.js'), 'utf8')
  } catch (error) {
    return { skills: actual, issues: ['src/client.js 读取失败：' + (error?.message ?? String(error))] }
  }

  const extracted = extractCatalogLiteral(source)
  if ('error' in extracted) {
    return { skills: actual, issues: [extracted.error] }
  }
  const declared = extracted.skills

  const issues = []
  if (declared.length !== actual.length) {
    issues.push('技能数量不一致：skills/ 目录 ' + actual.length + ' 个，客户端内联 ' + declared.length + ' 个')
  }

  const shared = Math.max(declared.length, actual.length)
  for (let i = 0; i < shared; i++) {
    const client = declared[i]
    const disk = actual[i]
    if (client === undefined) {
      issues.push('客户端清单缺少第 ' + (i + 1) + ' 项 ' + disk.name)
      continue
    }
    if (disk === undefined) {
      issues.push('客户端清单多出第 ' + (i + 1) + ' 项 ' + client.name + '，skills/ 目录中不存在')
      continue
    }
    if (client.name !== disk.name) {
      issues.push('第 ' + (i + 1) + ' 项技能名不一致：客户端 ' + client.name + '，磁盘 ' + disk.name)
      continue
    }
    if (client.description !== disk.description) {
      issues.push('技能 ' + client.name + ' 的描述与 SKILL.md 不一致，请同步客户端内联清单')
    }
  }

  return { skills: actual, issues }
}
