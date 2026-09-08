import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ClientPackage from './client-package'

const mocks = vi.hoisted(() => {
  const directories = new Set<string>()
  const files = new Map<string, string | Uint8Array>()
  const normalize = (path: string | URL) => String(path).replaceAll('\\', '/').replace(/\/$/, '')

  return {
    directories,
    files,
    parse: vi.fn(),
    exists: vi.fn(async (path: string | URL) => {
      const key = normalize(path)
      return directories.has(key) || files.has(key)
    }),
    mkdir: vi.fn(async (path: string | URL) => {
      const parts = normalize(path).split('/')
      for (let index = 1; index <= parts.length; index += 1) {
        directories.add(parts.slice(0, index).join('/'))
      }
    }),
    readDir: vi.fn(async (path: string | URL) => {
      const parent = normalize(path)
      const prefix = `${parent}/`
      return [...directories]
        .filter((directory) => directory.startsWith(prefix) && !directory.slice(prefix.length).includes('/'))
        .map((directory) => ({
          name: directory.slice(prefix.length),
          isDirectory: true,
          isFile: false,
          isSymlink: false,
        }))
    }),
    readFile: vi.fn(async (path: string | URL) => {
      const value = files.get(normalize(path))
      if (!(value instanceof Uint8Array)) throw new Error('File not found.')
      return Uint8Array.from(value)
    }),
    readTextFile: vi.fn(async (path: string | URL) => {
      const value = files.get(normalize(path))
      if (typeof value !== 'string') throw new Error('File not found.')
      return value
    }),
    remove: vi.fn(async (path: string | URL) => {
      const key = normalize(path)
      for (const file of files.keys()) {
        if (file === key || file.startsWith(`${key}/`)) files.delete(file)
      }
      for (const directory of directories) {
        if (directory === key || directory.startsWith(`${key}/`)) directories.delete(directory)
      }
    }),
    writeFile: vi.fn(async (path: string | URL, bytes: Uint8Array) => {
      files.set(normalize(path), Uint8Array.from(bytes))
    }),
    writeTextFile: vi.fn(async (path: string | URL, source: string) => {
      files.set(normalize(path), source)
    }),
  }
})

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }))
vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: mocks.exists,
  mkdir: mocks.mkdir,
  readDir: mocks.readDir,
  readFile: mocks.readFile,
  readTextFile: mocks.readTextFile,
  remove: mocks.remove,
  writeFile: mocks.writeFile,
  writeTextFile: mocks.writeTextFile,
}))
vi.mock('./client-package', () => ({ default: { parse: mocks.parse } }))

import ClientPackageRepository from './client-package-repository'

const createInstalledPackage = (): ClientPackage.Installed => ({
  sourceFileName: 'sample.mbcapp',
  byteLength: 3,
  archiveBytes: new Uint8Array([1, 2, 3]),
  digest: 'package-digest',
  manifest: { bundle: { bundleId: 'bundle-id' } },
  module: {},
  installationId: 'installation-id',
  displayName: 'Sample',
  installedAt: '2026-09-08T00:00:00.000Z',
  resourcePaths: { workspace: 'C:\\workspace' },
} as unknown as ClientPackage.Installed)

beforeEach(() => {
  mocks.directories.clear()
  mocks.files.clear()
  mocks.parse.mockImplementation(async (sourceFileName: string, archiveBytes: Uint8Array) => ({
    sourceFileName,
    byteLength: archiveBytes.byteLength,
    archiveBytes,
    digest: 'package-digest',
    manifest: { bundle: { bundleId: 'bundle-id' } },
    module: {},
  }))
})

describe('ClientPackageRepository', () => {
  it('saves and restores a package under the default Bundle directory', async () => {
    const installedPackage = createInstalledPackage()

    await ClientPackageRepository.save(installedPackage)
    const result = await ClientPackageRepository.load()

    expect(mocks.files.has('client/install/default/workspace.json')).toBe(true)
    expect(mocks.files.has(
      'client/install/default/packages/bundle-id/package.mbcapp',
    )).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.packages).toEqual([installedPackage])
  })

  it('removes the complete Bundle installation directory', async () => {
    const installedPackage = createInstalledPackage()
    await ClientPackageRepository.save(installedPackage)

    await ClientPackageRepository.deletePackage(installedPackage)

    expect(mocks.directories.has(
      'client/install/default/packages/bundle-id',
    )).toBe(false)
    expect(mocks.files.has(
      'client/install/default/packages/bundle-id/package.mbcapp',
    )).toBe(false)
  })
})
