/// <reference types="vite/client" />

import type { FSNode, FSEvent, FSResult } from '../../shared/ipc'

declare global {
  interface Window {
    prismarine: {
      ping(): Promise<string>

      // Filesystem
      fsExists(path: string): Promise<FSResult<boolean>>
      fsGet(path: string): Promise<FSResult<FSNode>>
      fsList(path: string): Promise<FSResult<FSNode[]>>
      fsReadFile(path: string): Promise<FSResult<string>>
      fsWriteFile(path: string, content: string): Promise<FSResult>
      fsMove(src: string, dest: string): Promise<FSResult>
      fsRename(path: string, newName: string): Promise<FSResult>
      fsDelete(path: string): Promise<FSResult>
      fsWatch(path: string): Promise<FSResult>
      fsUnwatch(path: string): Promise<FSResult>
      onFsEvent(callback: (event: FSEvent) => void): () => void
    }
  }
}
