import { useState, useEffect } from 'react'
import { useStore } from '../state/store'
import { PaneTree, PaneLeaf } from './components/PaneTree'
import { StatusBar } from './components/StatusBar'
import { Minibuffer } from './components/Minibuffer'
import { createKeyHandler } from '../input/keyHandler'
import { registerBuiltins } from '../commands/builtins'
import type { LayoutNode } from '../../shared/types'

function findPane(node: LayoutNode, paneId: string): { id: string; bufferId: string } | undefined {
  if (node.kind === 'leaf') return node.pane.id === paneId ? node.pane : undefined
  return findPane(node.a, paneId) ?? findPane(node.b, paneId)
}

function App(): JSX.Element {
  const layout = useStore((s) => s.layout)
  const maximizedPaneId = useStore((s) => s.maximizedPaneId)

  useEffect(() => {
    registerBuiltins()
    const handler = createKeyHandler()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const maximizedPane = maximizedPaneId ? findPane(layout.root, maximizedPaneId) : null

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-900 text-white">
      <StatusBar />
      <main className="flex-1 overflow-hidden">
        {maximizedPane
          ? <PaneLeaf pane={maximizedPane} />
          : <PaneTree node={layout.root} />
        }
      </main>
      <Minibuffer />
      {/* M1 IPC debug panel — kept for e2e tests */}
      <DebugPanel />
    </div>
  )
}

function DebugPanel(): JSX.Element {
  const [result, setResult] = useState<string>('')

  async function handlePing(): Promise<void> {
    const response = await window.prismarine.ping()
    setResult(response)
  }

  return (
    <div className="fixed bottom-10 right-4 rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-300">
      <p className="mb-2 font-semibold text-gray-400">IPC Debug</p>
      <button
        data-testid="ping-button"
        onClick={handlePing}
        className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-500"
      >
        Ping
      </button>
      {result && (
        <p data-testid="ping-result" className="mt-2 font-mono text-green-400">
          {result}
        </p>
      )}
    </div>
  )
}

export default App
