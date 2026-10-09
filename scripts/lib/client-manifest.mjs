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
import vm from 'node:vm'
import { SkillCatalog } from '../../lib/superpowers.js'

/**
 * 从 src/client.js 源码中纯内存沙箱提取 SKILL_CATALOG 数组。
 *
 * 彻底抛弃手写字符深度配平与 new Function 拼接（历史实现存在单双引号反斜杠误判陷阱）。
 * 遵循 dsh-plugin-dev 纯内存 AST / 沙箱执行规范，利用 Node 原生 node:vm 在纯内存
 * 环境下安全执行 client.js 工厂函数，直接截获导出的 SKILL_CATALOG 常量。
 *
 * @param {string} source - src/client.js 全文
 * @returns {{ skills: Array } | { error: string }}
 */
function extractCatalogLiteral(source) {
  let loadedSkills = null
  let loadError = null

  const mockReact = {
    createElement: () => null,
    useState: (v) => [v, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useSyncExternalStore: () => ({}),
  }

  const mockRequire = (id) => {
    if (id === 'react') return mockReact
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return {}
    return {}
  }

  const sandbox = {
    window: {
      __ModuleLoader__: {
        load: (entry) => {
          if (entry && typeof entry.factory === 'function') {
            try {
              const exports = entry.factory(mockRequire)
              if (exports && Array.isArray(exports.SKILL_CATALOG)) {
                loadedSkills = exports.SKILL_CATALOG
              }
            } catch (err) {
              loadError = err
            }
          }
        },
      },
    },
    document: {
      querySelector: () => null,
      createElement: () => ({ setAttribute: () => {}, textContent: '' }),
      head: { appendChild: () => {} },
    },
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  }

  try {
    vm.createContext(sandbox)
    const script = new vm.Script(source, { filename: 'src/client.js' })
    script.runInContext(sandbox)

    if (Array.isArray(loadedSkills)) {
      return { skills: loadedSkills }
    }
    if (loadError) {
      return { error: 'src/client.js 工厂执行失败: ' + (loadError.message ?? String(loadError)) }
    }
    return { error: 'src/client.js 未能通过沙箱导出有效的 SKILL_CATALOG 数组' }
  } catch (error) {
    return { error: '纯内存 node:vm 解析 src/client.js 语法失败: ' + (error?.message ?? String(error)) }
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
      issues.push('技能 ' + name + ' 的中文描述（frontmatter description_zh）不一致，请同步客户端内联清单')
    }
    if (client && (client.descriptionEn ?? '') !== disk.descriptionEn) {
      issues.push('技能 ' + name + ' 的英文描述（frontmatter description）不一致，请同步客户端内联清单')
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
    description: entry.document.descriptionZh,
    descriptionEn: entry.document.description,
  }))
}
