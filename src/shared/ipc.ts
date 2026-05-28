// Typed IPC contract — imported by main, preload, and renderer.
// Every channel must live here; no magic strings elsewhere.

export const IpcChannel = {
  PING: 'prismarine:ping',
  // ── Filesystem (renderer → main, invoke) ──────────────────────────────────
  FS_EXISTS:     'prismarine:fs:exists',
  FS_GET:        'prismarine:fs:get',
  FS_LIST:       'prismarine:fs:list',
  FS_READ_FILE:  'prismarine:fs:readFile',
  FS_WRITE_FILE: 'prismarine:fs:writeFile',
  FS_MOVE:       'prismarine:fs:move',
  FS_RENAME:     'prismarine:fs:rename',
  FS_DELETE:     'prismarine:fs:delete',
  FS_WATCH:      'prismarine:fs:watch',
  FS_UNWATCH:    'prismarine:fs:unwatch',
  // ── Filesystem (main → renderer, push) ───────────────────────────────────
  FS_EVENT:      'prismarine:fs:event',
} as const

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel]

// ── Ping ──────────────────────────────────────────────────────────────────────
export type PingResponse = string

// ── Filesystem types ──────────────────────────────────────────────────────────

export interface FSNode {
  name: string
  path: string
  isDir: boolean
  size: number
  /** Last-modified time as epoch milliseconds. */
  mtime: number
}

export type FSEvent =
  | { type: 'created';  path: string }
  | { type: 'changed';  path: string }
  | { type: 'deleted';  path: string }
  | { type: 'renamed';  oldPath: string; newPath: string }

/** Typed result — errors are values, not thrown strings. */
export type FSResult<T = null> =
  | { ok: true;  value: T }
  | { ok: false; error: string }
