import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { studioMcpIdentityPlugin } from '../../../release/studio-mcp.mjs'

// A real headless browser test; no Computer Use or production Studio process.
// Set MEBACO_PLAYWRIGHT_MODULE to an installed Playwright entrypoint if not on NODE_PATH.
const { chromium } = await import(process.env.MEBACO_PLAYWRIGHT_MODULE || 'playwright')
const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({
  configFile: false, root, plugins: [studioMcpIdentityPlugin(), svelte(), {
    name: 'mcp-preview-test-page', configureServer(server) {
      server.middlewares.use('/__mcp-preview-test', (_request, response) => {
        response.setHeader('Content-Type', 'text/html')
        response.end('<html><head><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%}#app{position:relative;width:100%;height:100%}*,*:before,*:after{box-sizing:border-box}</style></head><body><div id="app"></div><script type="module" src="/tests/mcp-preview-browser/harness.ts"></script></body></html>')
      })
    },
  }],
  resolve: { alias: [
    { find: '@system/workspace/tree/state', replacement: fileURLToPath(new URL('../tests/mcp-preview-browser/state.ts', import.meta.url)) },
    { find: '@system', replacement: fileURLToPath(new URL('../src/system', import.meta.url)) },
  ] }, server: { host: '127.0.0.1', port: 0 },
  optimizeDeps: { noDiscovery: true, include: ['svelte', 'svelte/store', 'svelte/reactivity', 'typescript', 'acorn'] },
})
let browser
try {
  await server.listen()
  console.log('Preview test server ready.')
  browser = await chromium.launch({ headless: true, timeout: 15000, channel: process.env.MEBACO_TEST_BROWSER_CHANNEL || 'msedge' })
  console.log('Headless browser ready.')
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message) })
  page.on('console', (message) => { if (message.type() === 'error') console.error(message.text()) })
  await page.goto(`${server.resolvedUrls.local[0]}__mcp-preview-test`)
  console.log('Browser test page loaded.')
  await page.waitForFunction(() => window.previewHarness != null)
  const call = (method, params) => page.evaluate(async ({ method, params }) => {
    try { return await window.previewHarness.handle(method, params) }
    catch (error) { return { error: { code: error.code, message: error.message } } }
  }, { method, params })
  const setup = (broken = false, overflow = false, invalidExpression = false) => page.evaluate(({ broken, overflow, invalidExpression }) => window.previewHarness.fixture(broken, overflow, invalidExpression), { broken, overflow, invalidExpression })
  await setup()
  assert.equal((await call('startPreview', { appId: 'test-app', expectedRevision: 1 })).error.code, 'REVISION_CONFLICT')
  assert.equal((await call('startPreview', { appId: 'test-app', expectedRevision: 0, viewport: { width: 0, height: 100 } })).error.code, 'INVALID_PARAMS')
  let snapshot = await call('startPreview', { appId: 'test-app', expectedRevision: 0, viewport: { width: 900, height: 540 }, timeoutMs: 1500 })
  assert.equal(snapshot.error, undefined, JSON.stringify(snapshot))
  const previewId = snapshot.previewId
  const inspect = (options = {}) => call('inspectPreview', { previewId, ...options })
  const find = (ref) => {
    const result = snapshot.elements.find((element) => element.refKey === ref)
    assert.ok(result, `missing ${ref}: ${JSON.stringify(snapshot)}`)
    return result
  }
  const interact = async (ref, action, options = {}) => {
    snapshot = await call('interactPreview', { previewId, elementId: find(ref).elementId, action, ...options })
    assert.equal(snapshot.error, undefined, JSON.stringify(snapshot))
    assert.equal(snapshot.runtimeFailure, null, JSON.stringify(snapshot.runtimeFailure))
    assert.equal(snapshot.settled, true)
  }
  assert.equal(snapshot.settled, true)
  assert.equal(snapshot.runtime.clientWidth, 900)
  assert.equal(snapshot.runtime.clientHeight, 540)
  assert.equal(snapshot.frame.scrollableY, false)
  assert.ok(snapshot.dialog.rect.height > snapshot.runtime.rect.height) // Includes preview header.
  assert.equal(find('left').style.resize, 'none')
  assert.equal((await call('startPreview', { appId: 'test-app', expectedRevision: 0 })).error.code, 'PREVIEW_ALREADY_OPEN')
  assert.equal((await call('interactPreview', { previewId, elementId: 'outside', action: 'click' })).error.code, 'ELEMENT_NOT_FOUND')
  assert.equal((await call('interactPreview', { previewId, elementId: find('disabled').elementId, action: 'click' })).error.code, 'ELEMENT_NOT_INTERACTABLE')
  assert.equal((await call('closePreview', { previewId: 'other-preview' })).error.code, 'PREVIEW_NOT_AVAILABLE')
  await interact('left', 'input', { value: '日本語' })
  assert.equal(snapshot.focusedElementId, find('left').elementId)
  await interact('encode', 'click') // Must commit left's blur before encoding.
  assert.equal(find('left').text, '日本語')
  assert.equal(find('right').text, '\\u65e5\\u672c\\u8a9e')
  assert.ok(snapshot.logs.some((entry) => entry.message.includes('encoding')))
  await interact('left', 'input', { value: '' })
  await interact('left', 'blur')
  assert.equal(find('left').text, '')
  await interact('decode', 'click')
  assert.equal(find('left').text, '日本語')
  assert.equal(find('right').text, '\\u65e5\\u672c\\u8a9e')
  await interact('right', 'input', { value: '\\u3042' })
  await interact('right', 'blur')
  assert.equal(find('right').text, '\\u3042') // No duplication on blur.
  await interact('textarea', 'input', { value: 'actual textarea\ntext' })
  assert.equal(find('textarea').value, 'actual textarea\ntext')
  await interact('left', 'input', { value: '長いテキスト\n'.repeat(150) })
  await interact('left', 'blur')
  assert.equal(find('left').scrollableY, true)
  assert.equal(snapshot.frame.scrollableY, false)
  await interact('left', 'scroll', { scrollTop: 200 })
  assert.equal(find('left').scrollTop, 200)
  const limited = await inspect({ maxElements: 1, maxTextLength: 2 })
  assert.equal(limited.elementsTruncated, true)
  assert.equal(limited.textTruncated, true)
  await page.evaluate(() => window.previewHarness.logBurst())
  const logged = await inspect()
  assert.equal(logged.logs.length, 100)
  assert.ok(logged.logs.every((entry) => entry.message.length <= 2000))
  await page.evaluate(() => window.previewHarness.bumpRevision())
  assert.equal((await inspect()).stale, true)
  assert.equal((await call('interactPreview', { previewId, elementId: find('left').elementId, action: 'blur' })).error.code, 'STALE_PREVIEW')
  assert.equal((await call('closePreview', { previewId })).closed, true)
  assert.equal((await inspect()).error.code, 'PREVIEW_NOT_AVAILABLE')
  await setup(false, true)
  snapshot = await call('startPreview', { appId: 'test-app', expectedRevision: 0, viewport: { width: 640, height: 360 } })
  assert.equal(snapshot.frame.scrollableY, true) // Detect bad outer layout.
  await call('closePreview', { previewId: snapshot.previewId })
  await setup(false, false, true)
  snapshot = await call('startPreview', { appId: 'test-app', expectedRevision: 0 })
  assert.ok(snapshot.diagnostics.some((entry) => /missing/.test(entry.message)))
  await call('closePreview', { previewId: snapshot.previewId })
  await setup(true)
  snapshot = await call('startPreview', { appId: 'test-app', expectedRevision: 0 })
  const encode = snapshot.elements.find((element) => element.refKey === 'encode')
  snapshot = await call('interactPreview', { previewId: snapshot.previewId, elementId: encode.elementId, action: 'click' })
  assert.match(snapshot.runtimeFailure.message, /fixture failure/)
  await page.evaluate(() => window.previewHarness.closeManually())
  assert.equal((await call('inspectPreview', { previewId: snapshot.previewId })).error.code, 'PREVIEW_NOT_AVAILABLE')
  assert.deepEqual(errors, [])
  console.log('MCP preview browser smoke passed: conversion/empty input/blur, textarea, focus, layout, inner/outer scrolling, bounds, stale IDs/revisions, errors and cleanup.')
} finally {
  await browser?.close()
  await server.close()
}
