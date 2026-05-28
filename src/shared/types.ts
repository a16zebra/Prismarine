// Core data model — imported by renderer state and (where needed) by main.
// Spec references: §5, §6, §18.

// ── Buffer ────────────────────────────────────────────────────────────────────

export type BufferType =
  | 'file-editor'
  | 'file-explorer'
  | 'prism-view'
  | 'browser'
  | 'terminal'
  | 'craft-editor'
  | 'scratch'

export type EditingState = 'normal' | 'insert' | 'visual'

export type MajorMode =
  | 'editor-mode'
  | 'explorer-mode'
  | 'prism-mode'
  | 'browser-mode'
  | 'terminal-mode'
  | 'craft-mode'
  | 'scratch-mode'

/** Derive the major mode from a buffer type. */
export function majorModeFor(type: BufferType): MajorMode {
  const map: Record<BufferType, MajorMode> = {
    'file-editor': 'editor-mode',
    'file-explorer': 'explorer-mode',
    'prism-view': 'prism-mode',
    browser: 'browser-mode',
    terminal: 'terminal-mode',
    'craft-editor': 'craft-mode',
    scratch: 'scratch-mode',
  }
  return map[type]
}

export interface PrismarineBuffer {
  id: string
  type: BufferType
  /** Filesystem path (file-editor, file-explorer, prism-view, craft-editor) */
  path?: string
  /** URL (browser) */
  url?: string
  title: string
  majorMode: MajorMode
  editingState: EditingState
  history: {
    back: string[]
    forward: string[]
  }
}

// ── Pane / Layout ─────────────────────────────────────────────────────────────

export interface Pane {
  id: string
  bufferId: string
}

/** Binary split tree leaf — holds one pane. */
export interface LayoutLeaf {
  kind: 'leaf'
  pane: Pane
}

/** Binary split tree interior node. `size` is the 0–1 fraction for child `a`. */
export interface LayoutSplit {
  kind: 'node'
  id: string
  direction: 'h' | 'v'
  /** Fraction (0–1) of total space given to child `a`. */
  size: number
  a: LayoutNode
  b: LayoutNode
}

export type LayoutNode = LayoutLeaf | LayoutSplit

export interface Layout {
  root: LayoutNode
  focusedPaneId: string
}
