import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, makeInitialState, INITIAL_BUFFER_ID, INITIAL_PANE_ID } from '../store'

beforeEach(() => {
  // Reset data fields; actions are preserved by shallow merge.
  useStore.setState(makeInitialState())
})

describe('createBuffer', () => {
  it('adds a new buffer to the store', () => {
    const id = useStore.getState().createBuffer('browser', { url: 'https://example.com' })
    const buf = useStore.getState().buffers[id]
    expect(buf).toBeDefined()
    expect(buf.type).toBe('browser')
    expect(buf.majorMode).toBe('browser-mode')
    expect(buf.editingState).toBe('normal')
    expect(buf.url).toBe('https://example.com')
  })

  it('derives the correct major mode for each buffer type', () => {
    const cases = [
      ['file-editor', 'editor-mode'],
      ['file-explorer', 'explorer-mode'],
      ['prism-view', 'prism-mode'],
      ['terminal', 'terminal-mode'],
      ['craft-editor', 'craft-mode'],
      ['scratch', 'scratch-mode'],
    ] as const
    for (const [type, mode] of cases) {
      const id = useStore.getState().createBuffer(type)
      expect(useStore.getState().buffers[id].majorMode).toBe(mode)
    }
  })
})

describe('closeBuffer', () => {
  it('removes the buffer from the store', () => {
    const id = useStore.getState().createBuffer('scratch')
    expect(useStore.getState().buffers[id]).toBeDefined()

    useStore.getState().closeBuffer(id)
    expect(useStore.getState().buffers[id]).toBeUndefined()
  })

  it('does not affect other buffers', () => {
    const id = useStore.getState().createBuffer('scratch')
    useStore.getState().closeBuffer(id)
    expect(useStore.getState().buffers[INITIAL_BUFFER_ID]).toBeDefined()
  })
})

describe('setEditingState', () => {
  it('changes the editing state of a buffer', () => {
    useStore.getState().setEditingState(INITIAL_BUFFER_ID, 'insert')
    expect(useStore.getState().buffers[INITIAL_BUFFER_ID].editingState).toBe('insert')
  })

  it('is a no-op for an unknown buffer id', () => {
    const before = useStore.getState().buffers
    useStore.getState().setEditingState('nonexistent', 'insert')
    expect(useStore.getState().buffers).toEqual(before)
  })
})

describe('focus selectors', () => {
  it('focusedPane returns the pane matching focusedPaneId', () => {
    const pane = useStore.getState().focusedPane()
    expect(pane).toBeDefined()
    expect(pane!.id).toBe(INITIAL_PANE_ID)
  })

  it('focusedBuffer returns the buffer in the focused pane', () => {
    const buf = useStore.getState().focusedBuffer()
    expect(buf).toBeDefined()
    expect(buf!.id).toBe(INITIAL_BUFFER_ID)
    expect(buf!.type).toBe('scratch')
  })

  it('openBuffers returns all buffers', () => {
    useStore.getState().createBuffer('browser')
    expect(useStore.getState().openBuffers()).toHaveLength(2)
  })
})
