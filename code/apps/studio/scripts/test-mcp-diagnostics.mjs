// Isolated browser fixture. Does not communicate with Studio or a live project.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { studioMcpIdentityPlugin } from '../../../release/studio-mcp.mjs'
const { chromium } = await import(
  process.env.MEBACO_PLAYWRIGHT_MODULE || 'playwright'
)
const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({
  configFile: false,
  root,
  plugins: [
    studioMcpIdentityPlugin(),
    svelte(),
    {
      name: 'mcp-diagnostics-fixture',
      configureServer(server) {
        server.middlewares.use('/__diagnostics', (_req, res) => {
          res.setHeader('Content-Type', 'text/html')
          res.end(
            '<html><head><link rel="icon" href="data:,"><style>:root{--mbc-color-border-strong:#8fcbd3;--mbc-color-text:#183e46;--mbc-color-text-muted:#45656d;--mbc-color-surface-soft:#f7fcfc;--mbc-color-focus-ring:#247b87}body{margin:0;font-family:sans-serif}</style></head><body><div id="app"></div><script type="module" src="/tests/mcp-diagnostics-browser/harness.ts"></script></body></html>',
          )
        })
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: '@system/infra/tauri/mcp',
        replacement: fileURLToPath(
          new URL(
            '../tests/mcp-diagnostics-browser/transport.ts',
            import.meta.url,
          ),
        ),
      },
      {
        find: '@system',
        replacement: fileURLToPath(new URL('../src/system', import.meta.url)),
      },
    ],
  },
  server: { host: '127.0.0.1', port: 0 },
  optimizeDeps: {
    noDiscovery: true,
    include: ['svelte', 'svelte/store', 'svelte/reactivity'],
  },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({
    headless: true,
    channel: process.env.MEBACO_TEST_BROWSER_CHANNEL || 'msedge',
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${server.resolvedUrls.local[0]}__diagnostics`)
  await page.getByRole('button', { name: 'MCP 接続診断を開く' }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByText('MCP_BRIDGE_GENERATION_MISMATCH', { exact: true })
    .first()
    .waitFor()
  assert.equal(await dialog.locator('article').count(), 8)
  assert.equal(await dialog.evaluate((d) => d.scrollTop), 0)
  const rect = await dialog.boundingBox()
  assert.ok(
    rect.x >= 0 &&
      rect.y >= 0 &&
      rect.x + rect.width <= 1280 &&
      rect.y + rect.height <= 800,
  )
  assert.ok(await dialog.evaluate((d) => d.scrollHeight > d.clientHeight))
  mkdirSync(new URL('../target/', import.meta.url), { recursive: true })
  await page.screenshot({
    path: fileURLToPath(
      new URL('../target/mcp-diagnostics.png', import.meta.url),
    ),
  })
  await page.keyboard.press('Escape')
  assert.equal(await dialog.isVisible(), false)
  await page.evaluate(() => window.diagnosticsHarness.setFixture(2, 0))
  await page.getByRole('button', { name: 'MCP 接続診断を開く' }).click()
  await dialog
    .getByText('Studioで観測した拒否はありません。', { exact: true })
    .waitFor()
  await page.setViewportSize({ width: 480, height: 640 })
  const small = await dialog.boundingBox()
  assert.ok(
    small.x >= 0 && small.y >= 0 && small.width <= 480 && small.height <= 640,
  )
  await page.evaluate(() => window.diagnosticsHarness.stop())
  await dialog.waitFor({ state: 'detached' })
  assert.deepEqual(errors, [])
  console.log(
    'MCP diagnostics browser fixture OK: paging area, small viewport, live refresh, Escape and session reset.',
  )
} finally {
  await browser?.close()
  await server.close()
}
