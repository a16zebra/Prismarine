// Prefix trie for multi-key sequences. Keys are KeyboardEvent.key strings.

interface TrieNode {
  children: Map<string, TrieNode>
  command: string | null
}

export type TrieResult =
  | { type: 'match'; command: string }
  | { type: 'prefix'; nextKeys: string[] }
  | { type: 'no-match' }

function makeNode(): TrieNode {
  return { children: new Map(), command: null }
}

export class KeyTrie {
  private root: TrieNode = makeNode()

  bind(sequence: string[], commandName: string): void {
    if (sequence.length === 0) return
    let node = this.root
    for (const key of sequence) {
      if (!node.children.has(key)) node.children.set(key, makeNode())
      node = node.children.get(key)!
    }
    node.command = commandName
  }

  resolve(sequence: string[]): TrieResult {
    let node = this.root
    for (const key of sequence) {
      const child = node.children.get(key)
      if (!child) return { type: 'no-match' }
      node = child
    }
    if (node.command !== null) return { type: 'match', command: node.command }
    const nextKeys = Array.from(node.children.keys())
    if (nextKeys.length > 0) return { type: 'prefix', nextKeys }
    return { type: 'no-match' }
  }

  /** Returns the available next keys for a given prefix, or [] if not a valid prefix. */
  nextKeys(sequence: string[]): string[] {
    const result = this.resolve(sequence)
    return result.type === 'prefix' ? result.nextKeys : []
  }
}
