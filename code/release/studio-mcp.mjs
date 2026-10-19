import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
export const identityInputs = [
  'release/studio-mcp.json',
  'release/studio-mcp.mjs',
  'apps/studio/src/system/version.ts',
  'apps/studio/package.json',
  'apps/studio/package-lock.json',
  'package-lock.json',
  'apps/studio/src-tauri/Cargo.toml',
  'apps/studio/src-tauri/tauri.conf.json',
  'apps/mcp/Cargo.toml',
].map((name) => path.join(root, name))
const u32 = (v) => Number.isInteger(v) && v >= 0 && v <= 0xffff_ffff
export const generationConstants = (source) =>
  Object.fromEntries(
    ['API_GEN', 'SCHEMA_GEN'].map((name) => {
      const definitions = source
        .split(/\r?\n/)
        .filter(
          (line) =>
            line.split('=')[0].trim().split(/\s+/).join(' ') ===
            `export const ${name}`,
        )
      assert.equal(definitions.length, 1, `Expected exactly one ${name}`)
      const value = JSON.parse(
        definitions[0]
          .slice(definitions[0].indexOf('=') + 1)
          .trim()
          .replace(/;$/, ''),
      )
      assert.ok(u32(value), `Invalid ${name}`)
      return [name, value]
    }),
  )
export const validateIdentity = (release, gens) => {
  assert.deepEqual(Object.keys(release).sort(), [
    'bridgeProtocolGen',
    'formatVersion',
    'releaseVersion',
  ])
  assert.equal(release.formatVersion, 1)
  assert.ok(
    typeof release.releaseVersion === 'string' &&
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(
        release.releaseVersion,
      ) &&
      release.releaseVersion.split('.').every((p) => u32(Number(p))),
  )
  assert.ok(u32(release.bridgeProtocolGen) && release.bridgeProtocolGen > 0)
  assert.ok(u32(gens.API_GEN) && u32(gens.SCHEMA_GEN))
  return Object.freeze({
    releaseVersion: release.releaseVersion,
    bridgeProtocolGen: release.bridgeProtocolGen,
    apiGen: gens.API_GEN,
    schemaGen: gens.SCHEMA_GEN,
  })
}
export const cargoPackageVersion = (source) => {
  const section = source.match(
    /^\[package\]\s*\r?\n([\s\S]*?)(?=^\[|(?![\s\S]))/m,
  )?.[1]
  const versions = [
    ...(section ?? '').matchAll(/^version\s*=\s*"([^"]+)"\s*$/gm),
  ]
  assert.equal(versions.length, 1, 'Expected one Cargo package version')
  return versions[0][1]
}
export const loadStudioMcpIdentity = (base = root) => {
  const read = (name) => readFileSync(path.join(base, name), 'utf8')
  const json = (name) => JSON.parse(read(name))
  const identity = validateIdentity(
    json('release/studio-mcp.json'),
    generationConstants(read('apps/studio/src/system/version.ts')),
  )
  const lock = json('apps/studio/package-lock.json')
  const versions = {
    'Studio npm': json('apps/studio/package.json').version,
    'Studio lock': lock.version,
    'Studio locked root': lock.packages[''].version,
    'workspace lock': json('package-lock.json').packages['apps/studio'].version,
    'Studio Cargo': cargoPackageVersion(
      read('apps/studio/src-tauri/Cargo.toml'),
    ),
    'Studio Tauri': json('apps/studio/src-tauri/tauri.conf.json').version,
    'MCP Cargo': cargoPackageVersion(read('apps/mcp/Cargo.toml')),
  }
  for (const [origin, version] of Object.entries(versions))
    assert.equal(
      version,
      identity.releaseVersion,
      `${origin} version differs from studio-mcp.json`,
    )
  return identity
}
export const studioMcpIdentityPlugin = () => {
  const id = 'virtual:mebaco-product-info'
  return {
    name: 'mebaco-product-info',
    buildStart() {
      loadStudioMcpIdentity()
      for (const file of identityInputs) this.addWatchFile(file)
    },
    resolveId(source) {
      return source === id ? '\0' + id : null
    },
    load(source) {
      return source === '\0' + id
        ? `export default ${JSON.stringify(loadStudioMcpIdentity())}`
        : null
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'product-identity.json',
        source: JSON.stringify(loadStudioMcpIdentity()),
      })
    },
    handleHotUpdate(context) {
      if (identityInputs.includes(context.file)) {
        void context.server.restart()
        return []
      }
    },
  }
}
