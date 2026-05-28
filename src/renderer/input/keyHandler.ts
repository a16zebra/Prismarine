import { useStore } from '../state/store'
import { getNewEditingState } from './editingStateUtils'
import { majorModeRegistry, runCommand } from './majorModeRegistry'
import { commandRegistry } from '../commands/commandRegistry'
import { keybindingRegistry } from '../commands/keybindingRegistry'

const LEADER_TIMEOUT_MS = 3000

let leaderTimeoutId: ReturnType<typeof setTimeout> | null = null

function clearLeaderTimeout(): void {
  if (leaderTimeoutId !== null) {
    clearTimeout(leaderTimeoutId)
    leaderTimeoutId = null
  }
}

function cancelLeader(): void {
  clearLeaderTimeout()
  useStore.getState().setLeaderActive(false, [])
  useStore.getState().setMinibuffer('', false)
}

function startLeaderTimeout(): void {
  clearLeaderTimeout()
  leaderTimeoutId = setTimeout(cancelLeader, LEADER_TIMEOUT_MS)
}

/** Format a key for display (Space → SPC, others → as-is). */
function displayKey(k: string): string {
  return k === ' ' ? 'SPC' : k
}

function buildWhichKeyHint(leaderKey: string, sequence: string[]): string {
  const prefix = [leaderKey, ...sequence].map(displayKey).join(' ')
  const next = keybindingRegistry.nextKeys(sequence).map(displayKey).join('  ')
  return `${prefix} ›  ${next || '(no bindings)'}`
}

// ── Palette key handling ──────────────────────────────────────────────────────

function handlePaletteKey(e: KeyboardEvent): void {
  e.preventDefault()
  const state = useStore.getState()

  if (e.key === 'Escape' || (e.key === 'g' && e.ctrlKey)) {
    state.closePalette()
    return
  }

  if (e.key === 'Enter') {
    const commands = commandRegistry.search(state.paletteQuery)
    const selected = commands[state.paletteSelectedIndex]
    if (selected) {
      state.closePalette()
      commandRegistry.run(selected.name)
    }
    return
  }

  if (e.key === 'ArrowDown') {
    const commands = commandRegistry.search(state.paletteQuery)
    state.setPaletteSelectedIndex(
      Math.min(state.paletteSelectedIndex + 1, commands.length - 1),
    )
    return
  }

  if (e.key === 'ArrowUp') {
    state.setPaletteSelectedIndex(Math.max(state.paletteSelectedIndex - 1, 0))
    return
  }

  if (e.key === 'Backspace') {
    state.setPaletteQuery(state.paletteQuery.slice(0, -1))
    return
  }

  if (e.key.length === 1) {
    state.setPaletteQuery(state.paletteQuery + e.key)
    return
  }
}

// ── Leader sequence handling ──────────────────────────────────────────────────

function handleLeaderKey(e: KeyboardEvent): void {
  const state = useStore.getState()

  if (e.key === 'Escape' || (e.key === 'g' && e.ctrlKey)) {
    e.preventDefault()
    cancelLeader()
    return
  }

  // Skip modifier-only keys
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

  e.preventDefault()
  const newSeq = [...state.leaderSequence, e.key]
  const result = keybindingRegistry.resolve(newSeq)

  if (result.type === 'match') {
    cancelLeader()
    commandRegistry.run(result.command)
    return
  }

  if (result.type === 'prefix') {
    state.setLeaderActive(true, newSeq)
    state.setMinibuffer(buildWhichKeyHint(state.leaderKey, newSeq), true)
    startLeaderTimeout()
    return
  }

  // no-match
  cancelLeader()
}

// ── Main handler ──────────────────────────────────────────────────────────────

export function createKeyHandler(): (e: KeyboardEvent) => void {
  return function handleKeyDown(e: KeyboardEvent): void {
    const state = useStore.getState()

    // Palette intercepts all keys before the input element check.
    if (state.paletteOpen) {
      handlePaletteKey(e)
      return
    }

    // Don't intercept events from text inputs (outside palette mode).
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const buffer = state.focusedBuffer()
    if (!buffer) return

    // terminal-mode: full passthrough.
    if (buffer.majorMode === 'terminal-mode') return

    // Leader sequence in progress.
    if (state.leaderActive) {
      handleLeaderKey(e)
      return
    }

    // Editing-state transitions (Esc → Normal; i/a/o/v/V for editor buffers).
    const newEditState = getNewEditingState(buffer, e.key)
    if (newEditState !== null) {
      state.setEditingState(buffer.id, newEditState)
      if (e.key === 'Escape') e.preventDefault()
      return
    }

    // In Normal state: check for leader key or major-mode keymap.
    if (buffer.editingState === 'normal') {
      if (e.key === state.leaderKey) {
        e.preventDefault()
        state.setLeaderActive(true, [])
        state.setMinibuffer(buildWhichKeyHint(state.leaderKey, []), true)
        startLeaderTimeout()
        return
      }

      // Major-mode keymap fallback (M4 behaviour — non-leader bindings).
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
