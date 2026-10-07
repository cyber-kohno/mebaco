import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Exercises the production AppRoot in an isolated browser without a Tauri bridge.
// Use MEBACO_PLAYWRIGHT_MODULE for an existing Playwright installation.
const { chromium } = await import(process.env.MEBACO_PLAYWRIGHT_MODULE || 'playwright')
const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({
  configFile: false, root,
  plugins: [svelte(), {
    name: 'launchers-test-page', configureServer(server) {
      server.middlewares.use('/__launchers-test', (_request, response) => {
        response.setHeader('Content-Type', 'text/html')
        response.end('<html><head><link rel="icon" href="data:"></head><body><div id="app"></div><script type="module" src="/tests/launchers-browser/harness.ts"></script></body></html>')
      })
    },
  }],
  resolve: { alias: { '@system': fileURLToPath(new URL('../src/system', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 0 },
})
let browser
const checkHover = async (page, row, content) => {
  const appearance = () => row.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      backgroundImage: style.backgroundImage, backgroundColor: style.backgroundColor,
      color: style.color, opacity: style.opacity, borderColor: style.borderColor, boxShadow: style.boxShadow,
    }
  })
  await page.mouse.move(0, 0)
  const normal = await appearance()
  const contentNormal = await content.evaluate((element) => ({ color: getComputedStyle(element).color, opacity: getComputedStyle(element).opacity }))
  await row.hover()
  const hovered = await appearance()
  assert.equal(normal.backgroundImage, 'none')
  assert.match(hovered.backgroundImage, /linear-gradient/)
  assert.match(hovered.backgroundImage, /0\.05/)
  assert.deepEqual({ ...hovered, backgroundImage: 'none' }, normal)
  assert.deepEqual(await content.evaluate((element) => ({ color: getComputedStyle(element).color, opacity: getComputedStyle(element).opacity })), contentNormal)
  if (process.env.MEBACO_TEST_SCREENSHOT_DIR) {
    const name = await row.evaluate((element) => `${element.tagName === 'TR' ? 'development-launcher' : element.classList.contains('package-row') ? 'client-package' : 'client-launcher'}-${element.classList.contains('selected') ? 'selected' : 'unselected'}-hover`)
    await row.screenshot({ path: `${process.env.MEBACO_TEST_SCREENSHOT_DIR}/${name}.png` })
  }
  await page.mouse.move(0, 0)
}

try {
  await server.listen()
  browser = await chromium.launch({ headless: true, channel: process.env.MEBACO_TEST_BROWSER_CHANNEL || 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(15000)
  page.setDefaultNavigationTimeout(60000)
  const errors = []
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message) })
  await page.goto(`${server.resolvedUrls.local[0]}__launchers-test`)
  await page.getByRole('heading', { name: 'Start developing' }).waitFor()
  await page.evaluate(() => window.launcherHarness.fixture())
  await page.getByRole('button', { name: 'Launchers', exact: true }).click()
  const screen = page.getByRole('region', { name: 'Development launchers' })
  await screen.waitFor()
  assert.equal(await screen.getByRole('row').count(), 3)
  const launch = screen.getByRole('button', { name: 'Launch', exact: true })
  assert.equal(await launch.isEnabled(), false)
  await screen.getByRole('button', { name: 'unconfigured', exact: true }).click()
  assert.equal(await launch.isEnabled(), false)
  const select = screen.getByRole('button', { name: 'Daily tool', exact: true })
  const row = screen.getByRole('row').filter({ hasText: 'Daily tool' })
  // The record-wide native button must accept clicks in every column.
  for (let column = 0; column < 4; column += 1) {
    const cell = await row.locator('td').nth(column).boundingBox()
    const clickCell = () => page.mouse.click(cell.x + cell.width / 2, cell.y + cell.height / 2)
    await clickCell()
    assert.equal(await select.getAttribute('aria-pressed'), 'true')
    assert.equal(await launch.isEnabled(), true)
    await clickCell()
    assert.equal(await select.getAttribute('aria-pressed'), 'false')
    assert.equal(await launch.isEnabled(), false)
  }
  await checkHover(page, row, select.locator('strong'))
  await select.focus()
  await page.keyboard.press('Enter')
  assert.equal(await select.getAttribute('aria-pressed'), 'true')
  await checkHover(page, row, select.locator('strong'))
  await page.keyboard.press('Space')
  assert.equal(await select.getAttribute('aria-pressed'), 'false')
  assert.equal(await launch.isEnabled(), false)
  await select.click()
  await screen.getByRole('searchbox').fill('daily')
  assert.equal(await screen.getByRole('row').count(), 2)
  if (process.env.MEBACO_TEST_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.MEBACO_TEST_SCREENSHOT_DIR}/development-launchers.png` })
  }
  await launch.click()
  const runtime = page.getByRole('region', { name: 'Mebaco application' })
  await runtime.getByText('Current development code', { exact: true }).waitFor()
  assert.equal(await page.getByRole('navigation', { name: 'Application operations' }).isVisible(), false)
  assert.equal(await page.locator('.runtime-dialog').count(), 0)
  const rect = await runtime.boundingBox()
  assert.equal(rect.width, 1440)
  assert.equal(rect.height, 900)
  await page.keyboard.press('t')
  assert.equal(await page.getByRole('dialog', { name: 'Mebaco terminal' }).count(), 0)
  if (process.env.MEBACO_TEST_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.MEBACO_TEST_SCREENSHOT_DIR}/application-runtime.png` })
  }
  await runtime.getByRole('button', { name: 'Exit application' }).click()
  await screen.waitFor()
  assert.equal(await select.getAttribute('aria-pressed'), 'true')
  assert.equal(await screen.getByRole('searchbox').inputValue(), 'daily')
  assert.equal(await page.getByRole('button', { name: 'Save', exact: true }).isEnabled(), true)

  // The client Launch button uses the same screen and restores its local selection.
  await page.evaluate(() => window.launcherHarness.openClient())
  const clientRow = page.locator('.launcher-row')
  await checkHover(page, clientRow, clientRow.locator('strong'))
  await clientRow.click()
  await checkHover(page, clientRow, clientRow.locator('strong'))
  await clientRow.click()
  assert.equal(await clientRow.getAttribute('aria-pressed'), 'false')
  await clientRow.focus()
  await page.keyboard.press('Space')
  assert.equal(await clientRow.getAttribute('aria-pressed'), 'true')
  const clientLaunch = page.locator('.launch-button')
  await clientLaunch.click()
  await runtime.getByText('Installed client code', { exact: true }).waitFor()
  await runtime.getByRole('button', { name: 'Exit application' }).click()
  assert.equal(await clientLaunch.isVisible(), true)
  assert.equal(await clientLaunch.isEnabled(), true)
  assert.equal(await page.locator('.launcher-row.selected').count(), 1)

  // Package records share the same hover layer for both selection states.
  await page.getByRole('button', { name: '← Back', exact: true }).click()
  const packageRow = page.locator('.package-row')
  await checkHover(page, packageRow, packageRow.locator('strong'))
  await packageRow.click()
  assert.equal(await packageRow.getAttribute('aria-pressed'), 'false')
  await checkHover(page, packageRow, packageRow.locator('strong'))
  await packageRow.focus()
  await page.keyboard.press('Enter')
  assert.equal(await packageRow.getAttribute('aria-pressed'), 'true')

  // Existing development previews keep their dialog and maximize controls.
  await page.evaluate(() => window.launcherHarness.preview())
  await page.locator('.runtime-dialog').waitFor()
  await page.getByRole('button', { name: 'Maximize preview' }).click()
  assert.equal(await page.locator('.runtime-dialog.maximized').count(), 1)
  await page.getByRole('button', { name: 'Close preview' }).click()
  assert.equal(await page.locator('.runtime-dialog').count(), 0)
  assert.deepEqual(errors, [])
  console.log('Launcher browser checks passed: record-wide selection/deselection, keyboard activation, shared hover in both selection states, arguments, application exit/return and preview compatibility.')
} finally {
  await browser?.close()
  await server.close()
}
