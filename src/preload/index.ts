import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/ipc'
import type { PingResponse } from '../shared/ipc'

contextBridge.exposeInMainWorld('prismarine', {
  ping: (): Promise<PingResponse> => ipcRenderer.invoke(IpcChannel.PING),
})
