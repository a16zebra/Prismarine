import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { PrismarineFS } from '../PrismarineFS'
import type { FSEvent } from '../../../shared/ipc'

let tmpDir: string
let pfs: PrismarineFS

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'prismarine-test-'))
  pfs = new PrismarineFS()
})

afterEach(async () => {
  await pfs.closeAll()
  await rm(tmpDir, { recursive: true, force: true })
})

// ── exists ────────────────────────────────────────────────────────────────────

describe('exists', () => {
  it('returns true for an existing file', async () => {
    const file = join(tmpDir, 'hello.txt')
    await writeFile(file, 'hi')
    const r = await pfs.exists(file)
    expect(r).toEqual({ ok: true, value: true })
  })

  it('returns false for a missing path', async () => {
    const r = await pfs.exists(join(tmpDir, 'ghost.txt'))
    expect(r).toEqual({ ok: true, value: false })
  })
})

// ── get ───────────────────────────────────────────────────────────────────────

describe('get', () => {
  it('returns FSNode for a file', async () => {
    const file = join(tmpDir, 'info.txt')
    await writeFile(file, 'content')
    const r = await pfs.get(file)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.name).toBe('info.txt')
    expect(r.value.isDir).toBe(false)
    expect(r.value.size).toBeGreaterThan(0)
    expect(r.value.mtime).toBeGreaterThan(0)
  })

  it('returns FSNode for a directory', async () => {
    const r = await pfs.get(tmpDir)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.isDir).toBe(true)
  })

  it('errors on a missing path', async () => {
    const r = await pfs.get(join(tmpDir, 'nope'))
    expect(r.ok).toBe(false)
  })
})

// ── list ──────────────────────────────────────────────────────────────────────

describe('list', () => {
  it('lists files and directories in a directory', async () => {
    await writeFile(join(tmpDir, 'a.txt'), 'a')
    await writeFile(join(tmpDir, 'b.txt'), 'b')
    await mkdir(join(tmpDir, 'sub'))

    const r = await pfs.list(tmpDir)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const names = r.value.map((n) => n.name).sort()
    expect(names).toContain('a.txt')
    expect(names).toContain('b.txt')
    expect(names).toContain('sub')

    const sub = r.value.find((n) => n.name === 'sub')
    expect(sub?.isDir).toBe(true)
  })

  it('errors on a missing directory', async () => {
    const r = await pfs.list(join(tmpDir, 'no-such-dir'))
    expect(r.ok).toBe(false)
  })
})

// ── readFile / writeFile ──────────────────────────────────────────────────────

describe('readFile / writeFile', () => {
  it('round-trips file content', async () => {
    const file = join(tmpDir, 'round.txt')
    const content = 'hello prismarine\n'
    const w = await pfs.writeFile(file, content)
    expect(w.ok).toBe(true)

    const r = await pfs.readFile(file)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toBe(content)
  })

  it('readFile errors on missing file', async () => {
    const r = await pfs.readFile(join(tmpDir, 'missing.txt'))
    expect(r.ok).toBe(false)
  })
})

// ── move / rename ─────────────────────────────────────────────────────────────

describe('move', () => {
  it('moves a file to a new path', async () => {
    const src = join(tmpDir, 'src.txt')
    const dest = join(tmpDir, 'dest.txt')
    await writeFile(src, 'data')

    const r = await pfs.move(src, dest)
    expect(r.ok).toBe(true)

    expect((await pfs.exists(src)).value).toBe(false)
    expect((await pfs.exists(dest)).value).toBe(true)
  })
})

describe('rename', () => {
  it('renames a file within the same directory', async () => {
    const file = join(tmpDir, 'old.txt')
    await writeFile(file, 'data')

    const r = await pfs.rename(file, 'new.txt')
    expect(r.ok).toBe(true)

    expect((await pfs.exists(file)).value).toBe(false)
    expect((await pfs.exists(join(tmpDir, 'new.txt'))).value).toBe(true)
  })
})

// ── delete ────────────────────────────────────────────────────────────────────

describe('delete', () => {
  it('deletes a file', async () => {
    const file = join(tmpDir, 'del.txt')
    await writeFile(file, 'bye')

    const r = await pfs.delete(file)
    expect(r.ok).toBe(true)
    expect((await pfs.exists(file)).value).toBe(false)
  })

  it('deletes a directory recursively', async () => {
    const sub = join(tmpDir, 'sub')
    await mkdir(sub)
    await writeFile(join(sub, 'file.txt'), 'x')

    const r = await pfs.delete(sub)
    expect(r.ok).toBe(true)
    expect((await pfs.exists(sub)).value).toBe(false)
  })
})

// ── path traversal guard ──────────────────────────────────────────────────────

describe('allowedRoot guard', () => {
  it('rejects paths outside the allowed root', async () => {
    const restricted = new PrismarineFS({ allowedRoot: tmpDir })
    const r = await restricted.exists('/etc/passwd')
    expect(r.ok).toBe(false)
    expect((r as { ok: false; error: string }).error).toMatch(/traversal/)
  })

  it('allows paths inside the allowed root', async () => {
    const restricted = new PrismarineFS({ allowedRoot: tmpDir })
    const r = await restricted.exists(join(tmpDir, 'anything.txt'))
    expect(r.ok).toBe(true)
  })
})

// ── watch ─────────────────────────────────────────────────────────────────────

describe('watch', () => {
  it('fires a created event when a file is added', async () => {
    const events: FSEvent[] = []
    pfs.watch(tmpDir, (e) => events.push(e))

    // Brief delay so chokidar is ready before we write
    await new Promise((r) => setTimeout(r, 300))

    const newFile = join(tmpDir, 'watched.txt')
    await writeFile(newFile, 'hello')

    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('watch timeout')), 4000)
      const poll = setInterval(() => {
        if (events.some((e) => e.type === 'created')) {
          clearInterval(poll)
          clearTimeout(deadline)
          resolve()
        }
      }, 50)
    })

    expect(events.some((e) => e.type === 'created')).toBe(true)
  }, 6000)

  it('fires a deleted event when a file is removed', async () => {
    const file = join(tmpDir, 'to-delete.txt')
    await writeFile(file, 'bye')
    await new Promise((r) => setTimeout(r, 300))

    const events: FSEvent[] = []
    pfs.watch(tmpDir, (e) => events.push(e))
    await new Promise((r) => setTimeout(r, 300))

    await pfs.delete(file)

    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('watch timeout')), 4000)
      const poll = setInterval(() => {
        if (events.some((e) => e.type === 'deleted')) {
          clearInterval(poll)
          clearTimeout(deadline)
          resolve()
        }
      }, 50)
    })

    expect(events.some((e) => e.type === 'deleted')).toBe(true)
  }, 6000)
})
