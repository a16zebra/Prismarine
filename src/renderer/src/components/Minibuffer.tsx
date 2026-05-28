import { useStore } from '../../state/store'

export function Minibuffer(): JSX.Element {
  const text = useStore((s) => s.minibufferText)
  const active = useStore((s) => s.minibufferActive)

  return (
    <div className={`flex h-8 items-center border-t border-gray-700 px-3 text-xs ${active ? 'bg-gray-800' : 'bg-gray-900'}`}>
      <span className="font-mono text-gray-400">{text || '\u00a0'}</span>
    </div>
  )
}
