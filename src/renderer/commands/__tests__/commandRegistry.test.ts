import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommandRegistry } from '../commandRegistry'

let registry: CommandRegistry

beforeEach(() => {
  registry = new CommandRegistry()
})

describe('CommandRegistry', () => {
  it('registers and runs a command', () => {
    const fn = vi.fn()
    registry.register('test.cmd', fn, { description: 'Test' })
    expect(registry.run('test.cmd')).toBe(true)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('returns false and warns for an unknown command', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(registry.run('unknown.cmd')).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('has() reflects registered commands', () => {
    expect(registry.has('a')).toBe(false)
    registry.register('a', () => {}, { description: 'A' })
    expect(registry.has('a')).toBe(true)
  })

  it('list() returns all registered commands', () => {
    registry.register('a', () => {}, { description: 'A' })
    registry.register('b', () => {}, { description: 'B' })
    const names = registry.list().map((c) => c.name)
    expect(names).toContain('a')
    expect(names).toContain('b')
  })

  it('search() filters by name substring', () => {
    registry.register('pane.splitRight', () => {}, { description: 'Split right' })
    registry.register('buffer.next', () => {}, { description: 'Next buffer' })
    const results = registry.search('pane').map((r) => r.name)
    expect(results).toContain('pane.splitRight')
    expect(results).not.toContain('buffer.next')
  })

  it('search() filters by description substring', () => {
    registry.register('pane.splitRight', () => {}, { description: 'Split pane right' })
    expect(registry.search('split')).toHaveLength(1)
  })

  it('search() with empty query returns all', () => {
    registry.register('a', () => {}, { description: 'A' })
    registry.register('b', () => {}, { description: 'B' })
    expect(registry.search('')).toHaveLength(2)
  })

  it('re-registering the same name overwrites the previous entry', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    registry.register('dup', fn1, { description: 'first' })
    registry.register('dup', fn2, { description: 'second' })
    registry.run('dup')
    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).toHaveBeenCalledOnce()
  })
})
