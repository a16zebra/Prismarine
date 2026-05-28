import { useMemo } from 'react'
import { useStore } from '../../state/store'
import { commandRegistry } from '../../commands/commandRegistry'
import type { CommandEntry } from '../../commands/commandRegistry'

export function Minibuffer(): JSX.Element {
  const minibufferText = useStore((s) => s.minibufferText)
  const minibufferActive = useStore((s) => s.minibufferActive)
  const paletteOpen = useStore((s) => s.paletteOpen)
  const paletteQuery = useStore((s) => s.paletteQuery)
  const paletteSelectedIndex = useStore((s) => s.paletteSelectedIndex)

  const filteredCommands = useMemo<CommandEntry[]>(
    () => commandRegistry.search(paletteQuery),
    [paletteQuery],
  )

  return (
    <div className="relative" data-testid="minibuffer-root">
      {paletteOpen && (
        <div
          data-testid="command-palette"
          className="absolute bottom-full left-0 right-0 z-50 max-h-72 overflow-y-auto border border-gray-600 bg-gray-900 shadow-xl"
        >
          {/* Query display */}
          <div className="border-b border-gray-700 px-3 py-1.5 text-xs text-gray-300">
            <span className="text-gray-500">M-x </span>
            <span>{paletteQuery}</span>
            <span className="animate-pulse text-gray-400">▋</span>
          </div>

          {filteredCommands.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">No commands match</div>
          ) : (
            filteredCommands.map((cmd, i) => (
              <div
                key={cmd.name}
                data-testid={i === paletteSelectedIndex ? 'palette-selected' : undefined}
                className={`flex gap-3 px-3 py-1.5 text-xs ${
                  i === paletteSelectedIndex
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="min-w-0 flex-1 font-mono">{cmd.name}</span>
                <span className="flex-shrink-0 text-gray-400">{cmd.description}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div
        className={`flex h-8 items-center border-t border-gray-700 px-3 text-xs ${
          minibufferActive || paletteOpen ? 'bg-gray-800' : 'bg-gray-900'
        }`}
      >
        <span className="font-mono text-gray-400">
          {paletteOpen
            ? `M-x ${paletteQuery}`
            : minibufferText || '\u00a0'}
        </span>
      </div>
    </div>
  )
}
