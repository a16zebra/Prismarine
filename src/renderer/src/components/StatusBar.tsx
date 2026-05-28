import { useEffect, useState } from 'react'
import { useStore } from '../../state/store'

export function StatusBar(): JSX.Element {
  const focusedBuffer = useStore((s) => s.focusedBuffer())
  const [clock, setClock] = useState<string>(formatTime(new Date()))

  useEffect(() => {
    const id = setInterval(() => setClock(formatTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  const mode = focusedBuffer?.majorMode ?? '—'
  const title = focusedBuffer?.title ?? '—'
  const editingState = focusedBuffer?.editingState ?? '—'

  return (
    <div className="flex h-8 items-center gap-4 border-b border-gray-700 bg-gray-800 px-3 text-xs text-gray-400">
      <span data-testid="major-mode" className="font-semibold text-indigo-400">{mode}</span>
      <span className="text-gray-200">{title}</span>
      <span data-testid="editing-state" className="rounded bg-gray-700 px-1.5 py-0.5 font-mono text-yellow-300">{editingState}</span>
      <span className="ml-auto font-mono text-gray-500">{clock}</span>
    </div>
  )
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
