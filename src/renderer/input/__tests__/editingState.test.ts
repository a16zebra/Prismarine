import { describe, it, expect } from 'vitest'
import { getNewEditingState } from '../editingStateUtils'
import type { PrismarineBuffer } from '../../../shared/types'

function makeBuffer(overrides: Partial<PrismarineBuffer> = {}): PrismarineBuffer {
  return {
    id: 'test-id',
    type: 'file-editor',
    title: 'test',
    majorMode: 'editor-mode',
    editingState: 'normal',
    history: { back: [], forward: [] },
    ...overrides,
  }
}

describe('getNewEditingState — editor buffer', () => {
  it('i enters Insert from Normal', () => {
    expect(getNewEditingState(makeBuffer(), 'i')).toBe('insert')
  })

  it('a enters Insert from Normal', () => {
    expect(getNewEditingState(makeBuffer(), 'a')).toBe('insert')
  })

  it('o enters Insert from Normal', () => {
    expect(getNewEditingState(makeBuffer(), 'o')).toBe('insert')
  })

  it('v enters Visual from Normal', () => {
    expect(getNewEditingState(makeBuffer(), 'v')).toBe('visual')
  })

  it('V enters Visual from Normal', () => {
    expect(getNewEditingState(makeBuffer(), 'V')).toBe('visual')
  })

  it('i does NOT enter Insert when already in Insert', () => {
    expect(getNewEditingState(makeBuffer({ editingState: 'insert' }), 'i')).toBeNull()
  })

  it('Escape returns to Normal from Insert', () => {
    expect(getNewEditingState(makeBuffer({ editingState: 'insert' }), 'Escape')).toBe('normal')
  })

  it('Escape returns to Normal from Visual', () => {
    expect(getNewEditingState(makeBuffer({ editingState: 'visual' }), 'Escape')).toBe('normal')
  })

  it('Escape from Normal stays Normal', () => {
    expect(getNewEditingState(makeBuffer(), 'Escape')).toBe('normal')
  })
})

describe('getNewEditingState — non-editor buffers', () => {
  it('explorer buffer ignores i (stays Normal)', () => {
    expect(getNewEditingState(makeBuffer({ type: 'file-explorer', majorMode: 'explorer-mode' }), 'i')).toBeNull()
  })

  it('browser buffer ignores v', () => {
    expect(getNewEditingState(makeBuffer({ type: 'browser', majorMode: 'browser-mode' }), 'v')).toBeNull()
  })

  it('scratch buffer ignores i', () => {
    expect(getNewEditingState(makeBuffer({ type: 'scratch', majorMode: 'scratch-mode' }), 'i')).toBeNull()
  })

  it('any non-terminal buffer still responds to Escape', () => {
    expect(getNewEditingState(makeBuffer({ type: 'file-explorer', majorMode: 'explorer-mode' }), 'Escape')).toBe('normal')
  })
})

describe('getNewEditingState — terminal-mode passthrough', () => {
  it('returns null for any key (passthrough)', () => {
    const buf = makeBuffer({ type: 'terminal', majorMode: 'terminal-mode' })
    expect(getNewEditingState(buf, 'i')).toBeNull()
    expect(getNewEditingState(buf, 'Escape')).toBeNull()
    expect(getNewEditingState(buf, 'a')).toBeNull()
  })
})
