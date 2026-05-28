import type { MajorMode } from '../../shared/types'

/** A keymap maps a key string to a command name. */
export type Keymap = Record<string, string>

/** Registry mapping each MajorMode to its Normal-state keymap. */
export type MajorModeRegistry = Partial<Record<MajorMode, Keymap>>

/**
 * Run a named command. Currently logs; M5 will wire real command dispatch.
 * Exported so tests can spy on it.
 */
export function runCommand(commandName: string, context: { mode: MajorMode }): void {
  console.log(`[${context.mode}] command: ${commandName}`)
}

/** The built-in major-mode registry (Normal-state keymaps). */
export const majorModeRegistry: MajorModeRegistry = {
  'explorer-mode': {
    j: 'explorer.cursorDown',
    k: 'explorer.cursorUp',
    h: 'explorer.collapse',
    l: 'explorer.expand',
    Enter: 'explorer.open',
    r: 'explorer.rename',
    d: 'explorer.delete',
    n: 'explorer.newFile',
    N: 'explorer.newDir',
  },
  'browser-mode': {
    H: 'browser.historyBack',
    L: 'browser.historyForward',
    r: 'browser.reload',
    f: 'browser.focusAddressBar',
    '/': 'browser.find',
    j: 'browser.scrollDown',
    k: 'browser.scrollUp',
  },
  // editor-mode: handled by Neovim (M23) / CodeMirror (M8) — not intercepted here.
  // terminal-mode: passthrough — not in registry.
  // prism-mode, craft-mode, scratch-mode: placeholder (no bindings yet).
  'prism-mode': {},
  'craft-mode': {},
  'scratch-mode': {},
}
