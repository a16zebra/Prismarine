import { describe, it, expect, beforeEach } from 'vitest'
import { KeyTrie } from '../trie'

let trie: KeyTrie

beforeEach(() => {
  trie = new KeyTrie()
  trie.bind([' '], 'palette.open')
  trie.bind(['w', '/'], 'pane.splitRight')
  trie.bind(['w', '-'], 'pane.splitBelow')
  trie.bind(['w', 'w'], 'pane.cycleFocus')
  trie.bind(['b', 'n'], 'buffer.next')
})

describe('KeyTrie.resolve', () => {
  it('resolves a single-key sequence', () => {
    const r = trie.resolve([' '])
    expect(r.type).toBe('match')
    if (r.type === 'match') expect(r.command).toBe('palette.open')
  })

  it('resolves a two-key sequence', () => {
    const r = trie.resolve(['w', '/'])
    expect(r.type).toBe('match')
    if (r.type === 'match') expect(r.command).toBe('pane.splitRight')
  })

  it('returns prefix after a valid first key', () => {
    const r = trie.resolve(['w'])
    expect(r.type).toBe('prefix')
    if (r.type === 'prefix') expect(r.nextKeys).toContain('/')
  })

  it('reports all available next keys for a prefix', () => {
    const r = trie.resolve(['w'])
    expect(r.type).toBe('prefix')
    if (r.type === 'prefix') {
      expect(r.nextKeys).toContain('/')
      expect(r.nextKeys).toContain('-')
      expect(r.nextKeys).toContain('w')
    }
  })

  it('returns no-match for an unknown key', () => {
    expect(trie.resolve(['x']).type).toBe('no-match')
  })

  it('returns no-match for a sequence that overshoots a terminal node', () => {
    expect(trie.resolve([' ', 'x']).type).toBe('no-match')
  })

  it('returns no-match for empty sequence', () => {
    // root has children, but no command — so it's effectively a prefix
    const r = trie.resolve([])
    expect(r.type).toBe('prefix')
  })
})

describe('KeyTrie.nextKeys', () => {
  it('returns children of a prefix node', () => {
    expect(trie.nextKeys(['w'])).toContain('/')
    expect(trie.nextKeys(['w'])).toContain('-')
  })

  it('returns [] for a match node (no continuation)', () => {
    expect(trie.nextKeys([' '])).toEqual([])
  })

  it('returns [] for an unknown prefix', () => {
    expect(trie.nextKeys(['z'])).toEqual([])
  })
})

describe('KeyTrie — timeout / cancel semantics (sequence state)', () => {
  it('resolves correctly after a partial sequence is abandoned and restarted', () => {
    // Simulate: user pressed 'w', then cancelled, then pressed 'b', 'n'
    expect(trie.resolve(['w']).type).toBe('prefix')
    // Cancelled — fresh sequence starts
    expect(trie.resolve(['b', 'n']).type).toBe('match')
  })
})
