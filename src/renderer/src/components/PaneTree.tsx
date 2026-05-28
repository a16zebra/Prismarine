import { useRef, type MouseEvent } from 'react'
import { useStore } from '../../state/store'
import type { LayoutNode, LayoutSplit, Pane } from '../../../shared/types'

// ── Entry point ───────────────────────────────────────────────────────────────

export function PaneTree({ node }: { node: LayoutNode }): JSX.Element {
  if (node.kind === 'leaf') return <PaneLeaf pane={node.pane} />
  return <PaneSplit node={node} />
}

// ── Leaf ──────────────────────────────────────────────────────────────────────

function PaneLeaf({ pane }: { pane: Pane }): JSX.Element {
  const buffers = useStore((s) => s.buffers)
  const focusedPaneId = useStore((s) => s.layout.focusedPaneId)
  const setFocusedPane = useStore((s) => s.setFocusedPane)
  const splitPane = useStore((s) => s.splitPane)
  const closePane = useStore((s) => s.closePane)

  const buffer = buffers[pane.bufferId]
  const isFocused = focusedPaneId === pane.id

  return (
    <div
      data-testid="pane-leaf"
      className={`flex h-full w-full flex-col ${isFocused ? 'ring-2 ring-indigo-500 ring-inset' : 'ring-1 ring-gray-700 ring-inset'}`}
      onClick={() => setFocusedPane(pane.id)}
    >
      {/* Buffer placeholder */}
      <div className="flex flex-1 items-center justify-center bg-gray-900 text-gray-400">
        <span className="font-mono text-sm">[{buffer?.type ?? 'unknown'}]</span>
      </div>

      {/* Temporary controls */}
      {isFocused && (
        <div className="flex gap-1 bg-gray-800 px-2 py-1">
          <button
            data-testid="split-h"
            className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-600"
            onClick={(e) => { e.stopPropagation(); splitPane(pane.id, 'h') }}
          >
            ⇔ H
          </button>
          <button
            data-testid="split-v"
            className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-600"
            onClick={(e) => { e.stopPropagation(); splitPane(pane.id, 'v') }}
          >
            ⇕ V
          </button>
          <button
            data-testid="close-pane"
            className="ml-auto rounded bg-red-900 px-2 py-0.5 text-xs text-red-300 hover:bg-red-800"
            onClick={(e) => { e.stopPropagation(); closePane(pane.id) }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Split ─────────────────────────────────────────────────────────────────────

function PaneSplit({ node }: { node: LayoutSplit }): JSX.Element {
  const setSplitSize = useStore((s) => s.setSplitSize)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleDividerMouseDown(e: MouseEvent<HTMLDivElement>): void {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const onMouseMove = (ev: MouseEvent): void => {
      const rect = container.getBoundingClientRect()
      if (node.direction === 'h') {
        const offset = ev.clientX - rect.left
        setSplitSize(node.id, Math.max(0.05, Math.min(0.95, offset / rect.width)))
      } else {
        const offset = ev.clientY - rect.top
        setSplitSize(node.id, Math.max(0.05, Math.min(0.95, offset / rect.height)))
      }
    }

    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const isHorizontal = node.direction === 'h'

  return (
    <div
      ref={containerRef}
      data-testid="split-node"
      data-split-id={node.id}
      data-split-size={node.size}
      className={`flex h-full w-full ${isHorizontal ? 'flex-row' : 'flex-col'}`}
    >
      <div style={{ flex: node.size, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <PaneTree node={node.a} />
      </div>

      <div
        data-testid="split-divider"
        className={`flex-none bg-gray-700 transition-colors hover:bg-indigo-500 ${
          isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
        }`}
        onMouseDown={handleDividerMouseDown}
      />

      <div style={{ flex: 1 - node.size, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <PaneTree node={node.b} />
      </div>
    </div>
  )
}
