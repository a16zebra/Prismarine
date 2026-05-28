import { promises as fsp } from 'fs'
import path from 'path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { FSNode, FSEvent, FSResult } from '../../shared/ipc'

export class PrismarineFS {
  private allowedRoot: string | null
  private watchers = new Map<string, FSWatcher>()

  constructor(opts: { allowedRoot?: string } = {}) {
    this.allowedRoot = opts.allowedRoot ?? null
  }

  // ── Path guard ─────────────────────────────────────────────────────────────

  private validate(p: string): FSResult<string> {
    const norm = path.resolve(p)
    if (this.allowedRoot) {
      const root = path.resolve(this.allowedRoot)
      if (norm !== root && !norm.startsWith(root + path.sep)) {
        return { ok: false, error: `Path traversal rejected: ${norm}` }
      }
    }
    return { ok: true, value: norm }
  }

  // ── Read operations ────────────────────────────────────────────────────────

  async exists(p: string): Promise<FSResult<boolean>> {
    const v = this.validate(p)
    if (!v.ok) return v
    try {
      await fsp.access(v.value)
      return { ok: true, value: true }
    } catch {
      return { ok: true, value: false }
    }
  }

  async get(p: string): Promise<FSResult<FSNode>> {
    const v = this.validate(p)
    if (!v.ok) return v
    try {
      const stat = await fsp.stat(v.value)
      return {
        ok: true,
        value: {
          name: path.basename(v.value),
          path: v.value,
          isDir: stat.isDirectory(),
          size: stat.size,
          mtime: stat.mtimeMs,
        },
      }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async list(dir: string): Promise<FSResult<FSNode[]>> {
    const v = this.validate(dir)
    if (!v.ok) return v
    try {
      const entries = await fsp.readdir(v.value, { withFileTypes: true })
      const nodes = await Promise.all(
        entries.map(async (e) => {
          const fullPath = path.join(v.value, e.name)
          const stat = await fsp.stat(fullPath)
          return {
            name: e.name,
            path: fullPath,
            isDir: e.isDirectory(),
            size: stat.size,
            mtime: stat.mtimeMs,
          } satisfies FSNode
        }),
      )
      return { ok: true, value: nodes }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async readFile(p: string): Promise<FSResult<string>> {
    const v = this.validate(p)
    if (!v.ok) return v
    try {
      return { ok: true, value: await fsp.readFile(v.value, 'utf-8') }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  // ── Write operations ───────────────────────────────────────────────────────

  async writeFile(p: string, content: string): Promise<FSResult> {
    const v = this.validate(p)
    if (!v.ok) return v
    try {
      await fsp.writeFile(v.value, content, 'utf-8')
      return { ok: true, value: null }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async move(src: string, dest: string): Promise<FSResult> {
    const vs = this.validate(src)
    if (!vs.ok) return vs
    const vd = this.validate(dest)
    if (!vd.ok) return vd
    try {
      await fsp.rename(vs.value, vd.value)
      return { ok: true, value: null }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async rename(p: string, newName: string): Promise<FSResult> {
    const v = this.validate(p)
    if (!v.ok) return v
    const newPath = path.join(path.dirname(v.value), newName)
    const vn = this.validate(newPath)
    if (!vn.ok) return vn
    try {
      await fsp.rename(v.value, vn.value)
      return { ok: true, value: null }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async delete(p: string): Promise<FSResult> {
    const v = this.validate(p)
    if (!v.ok) return v
    try {
      const stat = await fsp.stat(v.value)
      if (stat.isDirectory()) {
        await fsp.rm(v.value, { recursive: true })
      } else {
        await fsp.unlink(v.value)
      }
      return { ok: true, value: null }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  // ── Watch ──────────────────────────────────────────────────────────────────

  watch(dir: string, onEvent: (event: FSEvent) => void): FSResult {
    const v = this.validate(dir)
    if (!v.ok) return v
    if (this.watchers.has(v.value)) return { ok: true, value: null }

    const watcher = chokidar.watch(v.value, {
      persistent: false,
      ignoreInitial: true,
      depth: 0,
    })

    watcher.on('add',       (p) => onEvent({ type: 'created', path: p }))
    watcher.on('addDir',    (p) => onEvent({ type: 'created', path: p }))
    watcher.on('change',    (p) => onEvent({ type: 'changed', path: p }))
    watcher.on('unlink',    (p) => onEvent({ type: 'deleted', path: p }))
    watcher.on('unlinkDir', (p) => onEvent({ type: 'deleted', path: p }))

    this.watchers.set(v.value, watcher)
    return { ok: true, value: null }
  }

  async unwatch(dir: string): Promise<FSResult> {
    const v = this.validate(dir)
    if (!v.ok) return v
    const watcher = this.watchers.get(v.value)
    if (watcher) {
      await watcher.close()
      this.watchers.delete(v.value)
    }
    return { ok: true, value: null }
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.watchers.values()].map((w) => w.close()))
    this.watchers.clear()
  }
}
