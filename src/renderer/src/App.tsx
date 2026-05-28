import { useState } from 'react'

function App(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <h1 className="text-4xl font-bold tracking-tight text-white">Prismarine</h1>
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
    <div className="fixed bottom-4 right-4 rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-300">
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
