import { describe, it, expect } from 'vitest'
import { IpcChannel } from '../ipc'

describe('IPC contract', () => {
  it('all channel names are unique', () => {
    const values = Object.values(IpcChannel)
    expect(new Set(values).size).toBe(values.length)
  })

  it('channel names follow the prismarine: namespace convention', () => {
    for (const name of Object.values(IpcChannel)) {
      expect(name).toMatch(/^prismarine:/)
    }
  })
})
