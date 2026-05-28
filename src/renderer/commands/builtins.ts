import { commandRegistry } from './commandRegistry'
import { keybindingRegistry } from './keybindingRegistry'
import { useStore } from '../state/store'

let registered = false

/**
 * Register all built-in commands and their default keybindings.
 * Idempotent — safe to call multiple times (e.g. HMR).
 */
export function registerBuiltins(): void {
  if (registered) return
  registered = true

  const s = () => useStore.getState()

  // ── Pane commands ──────────────────────────────────────────────────────────

  commandRegistry.register(
    'pane.splitRight',
    () => { const p = s().focusedPane(); if (p) s().splitPane(p.id, 'h') },
    { description: 'Split focused pane to the right' },
  )

  commandRegistry.register(
    'pane.splitBelow',
    () => { const p = s().focusedPane(); if (p) s().splitPane(p.id, 'v') },
    { description: 'Split focused pane below' },
  )

  commandRegistry.register(
    'pane.cycleFocus',
    () => s().cycleFocusedPane(),
    { description: 'Cycle focus to next pane' },
  )

  commandRegistry.register(
    'pane.close',
    () => { const p = s().focusedPane(); if (p) s().closePane(p.id) },
    { description: 'Close focused pane' },
  )

  commandRegistry.register(
    'pane.maximize',
    () => { const p = s().focusedPane(); if (p) s().toggleMaximizePane(p.id) },
    { description: 'Toggle maximize focused pane' },
  )

  // ── Buffer commands ────────────────────────────────────────────────────────

  commandRegistry.register(
    'buffer.next',
    () => {
      const pane = s().focusedPane()
      if (!pane) return
      const buffers = s().openBuffers()
      const idx = buffers.findIndex((b) => b.id === pane.bufferId)
      const next = buffers[(idx + 1) % buffers.length]
      if (next) s().switchBufferInPane(pane.id, next.id)
    },
    { description: 'Switch to next buffer in focused pane' },
  )

  commandRegistry.register(
    'buffer.prev',
    () => {
      const pane = s().focusedPane()
      if (!pane) return
      const buffers = s().openBuffers()
      const idx = buffers.findIndex((b) => b.id === pane.bufferId)
      const next = buffers[(idx - 1 + buffers.length) % buffers.length]
      if (next) s().switchBufferInPane(pane.id, next.id)
    },
    { description: 'Switch to previous buffer in focused pane' },
  )

  commandRegistry.register(
    'buffer.kill',
    () => {
      const pane = s().focusedPane()
      if (!pane) return
      const buffers = s().openBuffers()
      if (buffers.length <= 1) return
      const idx = buffers.findIndex((b) => b.id === pane.bufferId)
      const next = buffers[(idx + 1) % buffers.length]!
      s().switchBufferInPane(pane.id, next.id)
      s().closeBuffer(buffers[idx]!.id)
    },
    { description: 'Kill current buffer' },
  )

  // ── Palette ────────────────────────────────────────────────────────────────

  commandRegistry.register(
    'palette.open',
    () => s().openPalette(),
    { description: 'Open command palette' },
  )

  // ── Default keybindings (sequences after the leader key) ──────────────────

  keybindingRegistry.bind([' '],        'palette.open')    // SPC SPC
  keybindingRegistry.bind(['w', '/'],   'pane.splitRight') // SPC w /
  keybindingRegistry.bind(['w', '-'],   'pane.splitBelow') // SPC w -
  keybindingRegistry.bind(['w', 'w'],   'pane.cycleFocus') // SPC w w
  keybindingRegistry.bind(['w', 'd'],   'pane.close')      // SPC w d
  keybindingRegistry.bind(['w', 'm'],   'pane.maximize')   // SPC w m
  keybindingRegistry.bind(['b', 'n'],   'buffer.next')     // SPC b n
  keybindingRegistry.bind(['b', 'p'],   'buffer.prev')     // SPC b p
  keybindingRegistry.bind(['b', 'd'],   'buffer.kill')     // SPC b d
}
