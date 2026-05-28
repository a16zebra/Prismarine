/**
 * Thin renderer-side FS client — mirrors PrismarineFS, calls through
 * window.prismarine (contextBridge). Never touches Node directly.
 */
import type { FSNode, FSEvent, FSResult } from '../../shared/ipc'

export type { FSNode, FSEvent, FSResult }

export const fsClient = {
  exists:    (path: string)                  => window.prismarine.fsExists(path),
  get:       (path: string)                  => window.prismarine.fsGet(path),
  list:      (path: string)                  => window.prismarine.fsList(path),
  readFile:  (path: string)                  => window.prismarine.fsReadFile(path),
  writeFile: (path: string, content: string) => window.prismarine.fsWriteFile(path, content),
  move:      (src: string, dest: string)     => window.prismarine.fsMove(src, dest),
  rename:    (path: string, newName: string) => window.prismarine.fsRename(path, newName),
  delete:    (path: string)                  => window.prismarine.fsDelete(path),
  watch:     (path: string)                  => window.prismarine.fsWatch(path),
  unwatch:   (path: string)                  => window.prismarine.fsUnwatch(path),
  onEvent:   (cb: (event: FSEvent) => void)  => window.prismarine.onFsEvent(cb),
} as const
