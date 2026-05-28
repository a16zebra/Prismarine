import { contextBridge } from 'electron'

// Empty contextBridge surface — extended in M1
contextBridge.exposeInMainWorld('prismarine', {})
