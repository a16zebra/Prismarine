import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { IpcChannel } from '../shared/ipc'
import type { PingResponse } from '../shared/ipc'
import { APP_VERSION } from '../shared/index'
import { PrismarineFS } from './fs/PrismarineFS'

const prismarineFS = new PrismarineFS()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Prismarine',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle(IpcChannel.PING, (): PingResponse => `pong ${APP_VERSION}`)

// ── PrismarineFS IPC handlers ─────────────────────────────────────────────────
ipcMain.handle(IpcChannel.FS_EXISTS,     (_e, p: string)                  => prismarineFS.exists(p))
ipcMain.handle(IpcChannel.FS_GET,        (_e, p: string)                  => prismarineFS.get(p))
ipcMain.handle(IpcChannel.FS_LIST,       (_e, p: string)                  => prismarineFS.list(p))
ipcMain.handle(IpcChannel.FS_READ_FILE,  (_e, p: string)                  => prismarineFS.readFile(p))
ipcMain.handle(IpcChannel.FS_WRITE_FILE, (_e, p: string, content: string) => prismarineFS.writeFile(p, content))
ipcMain.handle(IpcChannel.FS_MOVE,       (_e, src: string, dest: string)  => prismarineFS.move(src, dest))
ipcMain.handle(IpcChannel.FS_RENAME,     (_e, p: string, name: string)    => prismarineFS.rename(p, name))
ipcMain.handle(IpcChannel.FS_DELETE,     (_e, p: string)                  => prismarineFS.delete(p))
ipcMain.handle(IpcChannel.FS_UNWATCH,    (_e, p: string)                  => prismarineFS.unwatch(p))
ipcMain.handle(IpcChannel.FS_WATCH, (event, p: string) =>
  prismarineFS.watch(p, (fsEvent) => {
    if (!event.sender.isDestroyed()) event.sender.send(IpcChannel.FS_EVENT, fsEvent)
  }),
)

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
