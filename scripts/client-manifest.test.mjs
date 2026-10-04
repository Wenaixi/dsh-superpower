import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { assertClientManifest } from './lib/client-manifest.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-client-manifest-'))

try {
  await cp(join(root, 'skills'), join(tempRoot, 'skills'), { recursive: true })
  await mkdir(join(tempRoot, 'src'), { recursive: true })
  await mkdir(join(tempRoot, 'lib'), { recursive: true })
  await cp(join(root, 'src', 'client.js'), join(tempRoot, 'src-client.js'))
  await cp(join(root, 'lib', 'client.js'), join(tempRoot, 'lib-client.js'))
  await writeFile(join(tempRoot, 'src', 'client.js'), await readFile(join(tempRoot, 'src-client.js')))
  await writeFile(join(tempRoot, 'lib', 'client.js'), (await readFile(join(tempRoot, 'lib-client.js'), 'utf8')) + '\n// 临时副本中的客户端漂移\n')

  const result = await assertClientManifest(tempRoot)
  assert.ok(result.issues.some((issue) => issue.includes('src/client.js') && issue.includes('lib/client.js')), result.issues.join('\n'))
} finally {
  await rm(tempRoot, { recursive: true, force: true })
}

console.log('[client-manifest.test] mismatch is rejected')
