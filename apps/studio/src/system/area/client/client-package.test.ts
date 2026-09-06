import { afterEach, describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { get } from 'svelte/store'
import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../../version'
import ClientPackage from './client-package'
import ClientPackageStore from './client-package-store'

const createPackage = async (options: { schemaGen?: number; createdAt?: string } = {}) => {
  const app = {
    id: 10,
    element: { kind: 'app', appId: 'app-id', id: 'sample-app' },
    isOpen: true,
    children: [
      { id: 11, element: { kind: 'entry', componentId: 'component-id', propBindings: [] }, isOpen: true, children: [] },
      {
        id: 12, element: { kind: 'declares' }, isOpen: true, children: [
          { id: 13, element: { kind: 'components' }, isOpen: true, children: [
            { id: 14, element: { kind: 'component', componentId: 'component-id', id: 'Main' }, isOpen: true, children: [] },
          ] },
        ],
      },
      {
        id: 15, element: { kind: 'imports' }, isOpen: true, children: [
          { id: 16, element: { kind: 'resource-imports', resourceIds: ['resource-id'] }, isOpen: true, children: [] },
        ],
      },
    ],
  }
  const launcher = {
    kind: 'launcher', launcherId: 'launcher-id', id: 'main', name: 'Main Window',
    appId: 'app-id', argumentBindings: [],
  }
  const resource = { kind: 'directory-resource', resourceId: 'resource-id', id: 'workspace', permissions: { access: 'read', deleteFile: false, text: null, sqlite: null } }
  const manifest = {
    format: 'mebaco-app', formatVersion: 1, appVersion: APP_VERSION,
    schemaGen: options.schemaGen ?? SCHEMA_GEN, apiGen: API_GEN,
    createdAt: options.createdAt ?? '2026-09-07T00:00:00.000Z',
    bundle: { bundleId: 'bundle-uuid', id: 'desktop', launcherCount: 1, appCount: 1, resourceCount: 1 },
  }
  const module = {
    bundle: { bundleId: 'bundle-uuid', id: 'desktop', launcherIds: ['launcher-id'] },
    launchers: [launcher], apps: [app], common: null, resources: [resource],
  }
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest))
  zip.file('module.json', JSON.stringify(module))
  return zip.generateAsync({ type: 'uint8array' })
}

afterEach(() => ClientPackageStore.reset())

describe('ClientPackage', () => {
  it('loads a compatible mbcapp and resolves Launcher dependencies', async () => {
    const parsed = await ClientPackage.parse('sample.mbcapp', await createPackage())
    const installed = ClientPackageStore.install(parsed).installedPackage
    const analysis = ClientPackage.analyzeLauncher(installed, 'launcher-id')

    expect(parsed.manifest.bundle).toMatchObject({ id: 'desktop', launcherCount: 1 })
    expect(parsed.archiveBytes.byteLength).toBeGreaterThan(0)
    expect(analysis.errors).toEqual([])
    expect(analysis.apps.map((app) => app.element.id)).toEqual(['sample-app'])
    expect(analysis.resources.map((resource) => resource.element.id)).toEqual(['workspace'])
  })

  it('rejects incompatible schema generations before installation', async () => {
    await expect(ClientPackage.parse('future.mbcapp', await createPackage({ schemaGen: SCHEMA_GEN + 1 })))
      .rejects.toThrow('not compatible')
    expect(get(ClientPackageStore.value).packages).toEqual([])
  })

  it('selects an existing installation for duplicate package bytes', async () => {
    const bytes = await createPackage()
    const first = ClientPackageStore.install(await ClientPackage.parse('sample.mbcapp', bytes))
    const duplicate = ClientPackageStore.install(await ClientPackage.parse('copy.mbcapp', bytes))

    expect(first.status).toBe('installed')
    expect(duplicate.status).toBe('duplicate')
    expect(get(ClientPackageStore.value).packages).toHaveLength(1)
    expect(get(ClientPackageStore.value).selectedId).toBe(first.installedPackage.installationId)
  })

  it('keeps display name and resource path as installation settings', async () => {
    const installed = ClientPackageStore.install(
      await ClientPackage.parse('sample.mbcapp', await createPackage()),
    ).installedPackage

    expect(ClientPackageStore.rename(installed.installationId, 'Production')).toBe(true)
    ClientPackageStore.setResourcePath(installed.installationId, 'resource-id', 'C:\\data')

    expect(ClientPackageStore.find(installed.installationId)).toMatchObject({
      displayName: 'Production',
      sourceFileName: 'sample.mbcapp',
      resourcePaths: { 'resource-id': 'C:\\data' },
    })
  })
})
