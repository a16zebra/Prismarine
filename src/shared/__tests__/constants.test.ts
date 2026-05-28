import { describe, it, expect } from 'vitest'
import { APP_NAME, APP_VERSION } from '../index'

describe('shared constants', () => {
  it('APP_NAME is Prismarine', () => {
    expect(APP_NAME).toBe('Prismarine')
  })

  it('APP_VERSION matches semver', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
