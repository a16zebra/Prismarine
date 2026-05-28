import { create } from 'zustand'
import { nanoid } from './nanoid'
import type {
  PrismarineBuffer,
  BufferType,
  EditingState,
  Layout,
  LayoutNode,
  Pane,
} from '../../shared/types'
import { majorModeFor } from '../../shared/types'

// ── Tree helpers ──────────────────────────────────────────────────────────────

/** Remove a pane leaf by id. Returns null if this node was the removed leaf. */
function removePaneFromTree(node: LayoutNode, paneId: string): LayoutNode | null {
  if (node.kind === 'leaf') return node.pane.id === paneId ? null : node
  const newA = removePaneFromTree(node.a, paneId)
  const newB = removePaneFromTree(node.b, paneId)
  if (newA === null) return newB
  if (newB === null) return newA
  return { ...node, a: newA, b: newB }
}

function splitPaneInTree(
  node: LayoutNode,
  paneId: string,
  direction: 'h' | 'v',
  splitId: string,
  newPane: Pane,
): LayoutNode {
  if (node.kind === 'leaf') {
    if (node.pane.id !== paneId) return node
    return { kind: 'node', id: splitId, direction, size: 0.5, a: node, b: { kind: 'leaf', pane: newPane } }
  }
  return { ...node, a: splitPaneInTree(node.a, paneId, direction, splitId, newPane), b: splitPaneInTree(node.b, paneId, direction, splitId, newPane) }
}

function updateSplitSize(node: LayoutNode, splitId: string, size: number): LayoutNode {
  if (node.kind === 'leaf') return node
  if (node.id === splitId) return { ...node, size }
  return { ...node, a: updateSplitSize(node.a, splitId, size), b: updateSplitSize(node.b, splitId, size) }
}

// ── Initial state ─────────────────────────────────────────────────────────────

export const INITIAL_BUFFER_ID = nanoid()
export const INITIAL_PANE_ID = nanoid()

const initialBuffer: PrismarineBuffer = {
  id: INITIAL_BUFFER_ID,
  type: 'scratch',
  title: 'scratch',
  majorMode: 'scratch-mode',
  editingState: 'normal',
  history: { back: [], forward: [] },
}

const initialLayout: Layout = {
  root: { kind: 'leaf', pane: { id: INITIAL_PANE_ID, bufferId: INITIAL_BUFFER_ID } },
  focusedPaneId: INITIAL_PANE_ID,
}

export function makeInitialState(): Pick<
  StoreState,
  'buffers' | 'layout' | 'minibufferText' | 'minibufferActive'
> {
  return {
    buffers: { [INITIAL_BUFFER_ID]: initialBuffer },
    layout: initialLayout,
    minibufferText: '',
    minibufferActive: false,
  }
}

// ── Store shape ───────────────────────────────────────────────────────────────

export interface StoreState {
  buffers: Record<string, PrismarineBuffer>
  layout: Layout
  /** Minibuffer display text (placeholder for M4+). */
  minibufferText: string
  /** Whether the minibuffer is active. */
  minibufferActive: boolean

  // Actions
  createBuffer(type: BufferType, opts?: { path?: string; url?: string; title?: string }): string
  closeBuffer(bufferId: string): void
  setFocusedPane(paneId: string): void
  setEditingState(bufferId: string, state: EditingState): void
  switchBufferInPane(paneId: string, bufferId: string): void
  splitPane(paneId: string, direction: 'h' | 'v'): void
  closePane(paneId: string): void
  setSplitSize(splitId: string, size: number): void

  // Selectors
  focusedPane(): Pane | undefined
  focusedBuffer(): PrismarineBuffer | undefined
  openBuffers(): PrismarineBuffer[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Collect every leaf pane from a layout tree. */
function collectPanes(node: LayoutNode): Pane[] {
  if (node.kind === 'leaf') return [node.pane]
  return [...collectPanes(node.a), ...collectPanes(node.b)]
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<StoreState>((set, get) => ({
  buffers: { [INITIAL_BUFFER_ID]: initialBuffer },
  layout: initialLayout,
  minibufferText: '',
  minibufferActive: false,

  createBuffer(type, opts = {}) {
    const id = nanoid()
    const buffer: PrismarineBuffer = {
      id,
      type,
      path: opts.path,
      url: opts.url,
      title: opts.title ?? type,
      majorMode: majorModeFor(type),
      editingState: 'normal',
      history: { back: [], forward: [] },
    }
    set((s) => ({ buffers: { ...s.buffers, [id]: buffer } }))
    return id
  },

  closeBuffer(bufferId) {
    set((s) => {
      const next = { ...s.buffers }
      delete next[bufferId]
      return { buffers: next }
    })
  },

  setFocusedPane(paneId) {
    set((s) => ({ layout: { ...s.layout, focusedPaneId: paneId } }))
  },

  setEditingState(bufferId, state) {
    set((s) => {
      const buf = s.buffers[bufferId]
      if (!buf) return s
      return { buffers: { ...s.buffers, [bufferId]: { ...buf, editingState: state } } }
    })
  },

  splitPane(paneId, direction) {
    const newBufferId = nanoid()
    const newPaneId = nanoid()
    const splitId = nanoid()
    const newBuffer: PrismarineBuffer = {
      id: newBufferId,
      type: 'scratch',
      title: 'scratch',
      majorMode: 'scratch-mode',
      editingState: 'normal',
      history: { back: [], forward: [] },
    }
    const newPane: Pane = { id: newPaneId, bufferId: newBufferId }
    set((s) => ({
      buffers: { ...s.buffers, [newBufferId]: newBuffer },
      layout: {
        root: splitPaneInTree(s.layout.root, paneId, direction, splitId, newPane),
        focusedPaneId: newPaneId,
      },
    }))
  },

  closePane(paneId) {
    set((s) => {
      const allPanes = collectPanes(s.layout.root)
      if (allPanes.length <= 1) return s
      const newRoot = removePaneFromTree(s.layout.root, paneId)
      if (!newRoot) return s
      const remaining = collectPanes(newRoot)
      const focusedPaneId = remaining.some((p) => p.id === s.layout.focusedPaneId)
        ? s.layout.focusedPaneId
        : remaining[0]!.id
      return { layout: { root: newRoot, focusedPaneId } }
    })
  },

  setSplitSize(splitId, size) {
    set((s) => ({ layout: { ...s.layout, root: updateSplitSize(s.layout.root, splitId, size) } }))
  },

  switchBufferInPane(paneId, bufferId) {
    function updateLeaf(node: LayoutNode): LayoutNode {
      if (node.kind === 'leaf') {
        if (node.pane.id === paneId) {
          return { kind: 'leaf', pane: { id: paneId, bufferId } }
        }
        return node
      }
      return { ...node, a: updateLeaf(node.a), b: updateLeaf(node.b) }
    }
    set((s) => ({ layout: { ...s.layout, root: updateLeaf(s.layout.root) } }))
  },

  focusedPane() {
    const { layout } = get()
    return collectPanes(layout.root).find((p) => p.id === layout.focusedPaneId)
  },

  focusedBuffer() {
    const pane = get().focusedPane()
    if (!pane) return undefined
    return get().buffers[pane.bufferId]
  },

  openBuffers() {
    return Object.values(get().buffers)
  },
}))
