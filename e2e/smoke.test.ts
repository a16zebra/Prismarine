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

test('pane split, resize, focus, and close', async () => {
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), 'out', 'main', 'index.js')],
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  // Initial state: one pane
  await expect(window.locator('[data-testid="pane-leaf"]')).toHaveCount(1)

  // Split horizontally → two panes
  await window.click('[data-testid="split-h"]')
  await expect(window.locator('[data-testid="pane-leaf"]')).toHaveCount(2)

  // Resize via drag: drag divider 100px to the right
  const divider = window.locator('[data-testid="split-divider"]').first()
  const box = await divider.boundingBox()
  if (!box) throw new Error('divider not found')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await window.mouse.move(cx, cy)
  await window.mouse.down()
  await window.mouse.move(cx + 100, cy, { steps: 10 })
  await window.mouse.up()

  // Verify size attribute changed from 0.5
  const splitNode = window.locator('[data-testid="split-node"]').first()
  const sizeAttr = await splitNode.getAttribute('data-split-size')
  expect(parseFloat(sizeAttr ?? '0.5')).toBeGreaterThan(0.5)

  // Click the LEFT pane to focus it
  await window.locator('[data-testid="pane-leaf"]').first().click()

  // Close the focused (left) pane → back to one pane
  await window.click('[data-testid="close-pane"]')
  await expect(window.locator('[data-testid="pane-leaf"]')).toHaveCount(1)

  await electronApp.close()
})

test('editing state: Esc returns to Normal; non-editor ignores i', async () => {
  const electronApp = await electron.launch({
    args: [path.join(process.cwd(), 'out', 'main', 'index.js')],
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  // Initial editing state is 'normal'
  await expect(window.locator('[data-testid="editing-state"]')).toHaveText('normal')

  // Default buffer is scratch (non-editor) — pressing i must not change state
  await window.locator('[data-testid="pane-leaf"]').first().click()
  await window.keyboard.press('i')
  await expect(window.locator('[data-testid="editing-state"]')).toHaveText('normal')

  // Pressing Escape on an already-Normal buffer stays Normal (no crash)
  await window.keyboard.press('Escape')
  await expect(window.locator('[data-testid="editing-state"]')).toHaveText('normal')

  // Major mode label is visible
  await expect(window.locator('[data-testid="major-mode"]')).toHaveText('scratch-mode')

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
