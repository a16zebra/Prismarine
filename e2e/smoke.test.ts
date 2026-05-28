import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test('app launches and shows Prismarine title', async () => {
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), 'out', 'main', 'index.js')],
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  expect(await window.title()).toBe('Prismarine')

  await electronApp.close()
})

test('ping round-trip returns pong response', async () => {
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), 'out', 'main', 'index.js')],
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.click('[data-testid="ping-button"]')
  const result = await window.textContent('[data-testid="ping-result"]')

  expect(result).toMatch(/^pong /)

  await electronApp.close()
})
