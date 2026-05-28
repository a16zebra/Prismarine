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

describe('splitPane', () => {
  it('adds a new pane and buffer to the tree', () => {
    const before = useStore.getState().layout
    expect(before.root.kind).toBe('leaf')

    useStore.getState().splitPane(INITIAL_PANE_ID, 'h')

    const root = useStore.getState().layout.root
    expect(root.kind).toBe('node')
    if (root.kind === 'node') {
      expect(root.direction).toBe('h')
      expect(root.size).toBe(0.5)
      expect(root.a.kind).toBe('leaf')
      expect(root.b.kind).toBe('leaf')
    }
  })

  it('focuses the new pane after splitting', () => {
    useStore.getState().splitPane(INITIAL_PANE_ID, 'v')
    const layout = useStore.getState().layout
    expect(layout.focusedPaneId).not.toBe(INITIAL_PANE_ID)
  })

  it('creates a new scratch buffer for the new pane', () => {
    const beforeCount = Object.keys(useStore.getState().buffers).length
    useStore.getState().splitPane(INITIAL_PANE_ID, 'h')
    expect(Object.keys(useStore.getState().buffers)).toHaveLength(beforeCount + 1)
  })
})

describe('closePane', () => {
  it('collapses the tree so the sibling takes the space', () => {
    useStore.getState().splitPane(INITIAL_PANE_ID, 'h')
    const newFocusedId = useStore.getState().layout.focusedPaneId

    useStore.getState().closePane(newFocusedId)

    const root = useStore.getState().layout.root
    expect(root.kind).toBe('leaf')
    if (root.kind === 'leaf') expect(root.pane.id).toBe(INITIAL_PANE_ID)
  })

  it('does not close the last remaining pane', () => {
    useStore.getState().closePane(INITIAL_PANE_ID)
    expect(useStore.getState().layout.root.kind).toBe('leaf')
  })

  it('updates focusedPaneId when the focused pane is closed', () => {
    useStore.getState().splitPane(INITIAL_PANE_ID, 'h')
    const newPaneId = useStore.getState().layout.focusedPaneId
    expect(newPaneId).not.toBe(INITIAL_PANE_ID)

    useStore.getState().closePane(newPaneId)
    expect(useStore.getState().layout.focusedPaneId).toBe(INITIAL_PANE_ID)
  })
})

describe('setSplitSize', () => {
  it('updates the size fraction of a split node', () => {
    useStore.getState().splitPane(INITIAL_PANE_ID, 'h')
    const root = useStore.getState().layout.root
    if (root.kind !== 'node') throw new Error('expected split node')

    useStore.getState().setSplitSize(root.id, 0.3)

    const updated = useStore.getState().layout.root
    if (updated.kind !== 'node') throw new Error('expected split node')
    expect(updated.size).toBe(0.3)
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
