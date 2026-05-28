import { KeyTrie } from './trie'
import type { TrieResult } from './trie'

class KeybindingRegistry {
  private trie = new KeyTrie()
  /** The leader key. Configurable — default Space. Used later by init.py. */
  leaderKey: string = ' '

  bind(sequence: string[], commandName: string): void {
    this.trie.bind(sequence, commandName)
  }

  resolve(sequence: string[]): TrieResult {
    return this.trie.resolve(sequence)
  }

  /** Available next keys after the given prefix (for which-key display). */
  nextKeys(sequence: string[]): string[] {
    return this.trie.nextKeys(sequence)
  }
}

export const keybindingRegistry = new KeybindingRegistry()
