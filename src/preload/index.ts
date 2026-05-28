import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/ipc'
import type { PingResponse, FSEvent } from '../shared/ipc'

contextBridge.exposeInMainWorld('prismarine', {
  // ── Ping ────────────────────────────────────────────────────────────────────
  ping: (): Promise<PingResponse> => ipcRenderer.invoke(IpcChannel.PING),

  // ── Filesystem (invoke) ─────────────────────────────────────────────────────
  fsExists:    (p: string)                  => ipcRenderer.invoke(IpcChannel.FS_EXISTS,     p),
  fsGet:       (p: string)                  => ipcRenderer.invoke(IpcChannel.FS_GET,        p),
  fsList:      (p: string)                  => ipcRenderer.invoke(IpcChannel.FS_LIST,       p),
  fsReadFile:  (p: string)                  => ipcRenderer.invoke(IpcChannel.FS_READ_FILE,  p),
  fsWriteFile: (p: string, c: string)       => ipcRenderer.invoke(IpcChannel.FS_WRITE_FILE, p, c),
  fsMove:      (src: string, dest: string)  => ipcRenderer.invoke(IpcChannel.FS_MOVE,       src, dest),
  fsRename:    (p: string, name: string)    => ipcRenderer.invoke(IpcChannel.FS_RENAME,     p, name),
  fsDelete:    (p: string)                  => ipcRenderer.invoke(IpcChannel.FS_DELETE,     p),
  fsWatch:     (p: string)                  => ipcRenderer.invoke(IpcChannel.FS_WATCH,      p),
  fsUnwatch:   (p: string)                  => ipcRenderer.invoke(IpcChannel.FS_UNWATCH,    p),

  // ── Filesystem (push: main → renderer) ─────────────────────────────────────
  onFsEvent: (callback: (event: FSEvent) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: FSEvent) => callback(event)
    ipcRenderer.on(IpcChannel.FS_EVENT, handler)
    return () => ipcRenderer.removeListener(IpcChannel.FS_EVENT, handler)
  },
})
