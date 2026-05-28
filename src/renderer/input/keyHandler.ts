import { useStore } from '../state/store'
import { getNewEditingState } from './editingStateUtils'
import { majorModeRegistry, runCommand } from './majorModeRegistry'

/**
 * Returns the single global keydown handler for the renderer.
 * Attach once to window; it reads store state imperatively on each event.
 *
 * Architectural decision (SPEC.md §6): one handler at the renderer level;
 * routes to the focused pane's major mode and editing state.
 */
export function createKeyHandler(): (e: KeyboardEvent) => void {
  return function handleKeyDown(e: KeyboardEvent): void {
    // Never intercept events originating from input/textarea elements.
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const state = useStore.getState()
    const buffer = state.focusedBuffer()
    if (!buffer) return

    // terminal-mode: full passthrough.
    if (buffer.majorMode === 'terminal-mode') return

    // Attempt an editing-state transition.
    const newState = getNewEditingState(buffer, e.key)
    if (newState !== null) {
      state.setEditingState(buffer.id, newState)
      // Prevent Escape from bubbling (e.g. closing dialogs).
      if (e.key === 'Escape') e.preventDefault()
      return
    }

    // In Normal state, dispatch to the major-mode keymap.
    if (buffer.editingState === 'normal') {
      const keymap = majorModeRegistry[buffer.majorMode]
      if (keymap) {
        const command = keymap[e.key]
        if (command) {
          e.preventDefault()
          runCommand(command, { mode: buffer.majorMode })
        }
      }
    }
  }
}
