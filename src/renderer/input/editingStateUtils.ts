import type { PrismarineBuffer, EditingState } from '../../shared/types'

/** Buffer types that participate in the Insert/Visual editing-state machine. */
const EDITOR_TYPES = new Set<PrismarineBuffer['type']>(['file-editor'])

/**
 * Pure function: given the current buffer and a key string, return the new
 * EditingState, or null if the key does not trigger a state transition.
 *
 * Rules (SPEC.md §6.1):
 * - terminal-mode: passthrough — never intercept.
 * - Escape always returns 'normal' (for any non-terminal buffer).
 * - Only EDITOR_TYPES respond to i/a/o (→ insert) and v/V (→ visual).
 * - Non-editor buffers stay effectively Normal; no Insert/Visual.
 */
export function getNewEditingState(
  buffer: PrismarineBuffer,
  key: string,
): EditingState | null {
  if (buffer.majorMode === 'terminal-mode') return null

  if (key === 'Escape') return 'normal'

  if (EDITOR_TYPES.has(buffer.type) && buffer.editingState === 'normal') {
    if (key === 'i' || key === 'a' || key === 'o') return 'insert'
    if (key === 'v' || key === 'V') return 'visual'
  }

  return null
}
