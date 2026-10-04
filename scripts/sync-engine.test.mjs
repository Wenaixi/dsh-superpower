import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SyncEngine } from './lib/sync-engine.mjs'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'sync-engine-test-'))
  const upstream = join(root, 'upstream')
  const local = join(root, 'local')
  await mkdir(upstream, { recursive: true })
  await mkdir(local, { recursive: true })
  const body = ['---', 'name: demo', 'description: demo', '---', '', '# Demo', '', '```sh', 'echo upstream', '```', ''].join('\n')
  const changed = body.replace('echo upstream', 'echo local')
  await writeFile(join(upstream, 'demo.md'), body)
  await writeFile(join(local, 'demo.md'), changed)
  return { root, upstream, local }
}

test('reviewDeep returns diagnostics without writing to console by default', async () => {
  const f = await fixture()
  try {
    const engine = new SyncEngine(f.upstream, f.local)
    const originalLog = console.log
    const output = []
    console.log = (...args) => output.push(args.join(' '))
    try {
      const result = await engine.reviewDeep()
      assert.equal(output.length, 0)
      assert.equal(result.ok, true)
      assert.equal(result.notes.length, 1)
    } finally {
      console.log = originalLog
    }
  } finally {
    await rm(f.root, { recursive: true, force: true })
  }
})

test('reviewFences returns structured differences for callers to report', async () => {
  const f = await fixture()
  try {
    const engine = new SyncEngine(f.upstream, f.local)
    const result = await engine.reviewFences(['demo.md'])
    assert.equal(result.ok, true)
    assert.equal(result.files.length, 1)
    assert.equal(result.files[0].blocks.length, 1)
    assert.equal(result.files[0].blocks[0].upstream, 'echo upstream')
    assert.equal(result.files[0].blocks[0].local, 'echo local')
  } finally {
    await rm(f.root, { recursive: true, force: true })
  }
})
