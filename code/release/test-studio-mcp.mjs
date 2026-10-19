import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  root,
  identityInputs,
  generationConstants,
  validateIdentity,
  cargoPackageVersion,
  loadStudioMcpIdentity,
  studioMcpIdentityPlugin,
} from './studio-mcp.mjs'

test('metadata and strict generations', () => {
  const identity = loadStudioMcpIdentity()
  assert.ok(identity.bridgeProtocolGen > 0)
  for (const bridgeProtocolGen of [0, -1, 1.5, '1', 4294967296])
    assert.throws(() =>
      validateIdentity(
        { formatVersion: 1, releaseVersion: '0.1.1', bridgeProtocolGen },
        { API_GEN: 1, SCHEMA_GEN: 1 },
      ),
    )
  for (const source of [
    'export const API_GEN = 1 + 1\nexport const SCHEMA_GEN = 1',
    'export const API_GEN = 1\nexport const API_GEN = 2\nexport const SCHEMA_GEN = 1',
  ])
    assert.throws(() => generationConstants(source))
  assert.equal(
    cargoPackageVersion(
      '[package]\nversion = "1.2.3"\n[dependencies]\nversion = "9.9.9"',
    ),
    '1.2.3',
  )
})
test('all manifest mirrors and generation changes are checked without import cache', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'mebaco-identity-'))
  try {
    for (const file of identityInputs)
      cpSync(file, path.join(base, path.relative(root, file)), {
        recursive: true,
      })
    const file = path.join(base, 'apps/studio/package.json')
    const original = readFileSync(file, 'utf8')
    writeFileSync(
      file,
      original.replace('"version": "0.1.1"', '"version": "0.9.9"'),
    )
    assert.throws(() => loadStudioMcpIdentity(base))
    writeFileSync(file, original)
    const metadata = path.join(base, 'release/studio-mcp.json')
    const value = JSON.parse(readFileSync(metadata, 'utf8'))
    value.bridgeProtocolGen += 1
    writeFileSync(metadata, JSON.stringify(value))
    assert.equal(
      loadStudioMcpIdentity(base).bridgeProtocolGen,
      value.bridgeProtocolGen,
    )
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
test('Vite emits exactly the runtime identity and watches source changes', () => {
  const plugin = studioMcpIdentityPlugin()
  const watched = []
  const emitted = []
  plugin.buildStart.call({ addWatchFile: (f) => watched.push(f) })
  plugin.generateBundle.call({ emitFile: (f) => emitted.push(f) })
  assert.deepEqual(JSON.parse(emitted[0].source), loadStudioMcpIdentity())
  assert.equal(watched.length, identityInputs.length)
  assert.ok(
    plugin
      .load(plugin.resolveId('virtual:mebaco-product-info'))
      .includes(JSON.stringify(loadStudioMcpIdentity())),
  )
  let restarts = 0
  plugin.handleHotUpdate({
    file: identityInputs[0],
    server: {
      restart: () => {
        restarts++
      },
    },
  })
  assert.equal(restarts, 1)
})
