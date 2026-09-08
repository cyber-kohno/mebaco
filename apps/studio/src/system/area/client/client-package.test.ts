import { afterEach, describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { get } from 'svelte/store'
import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../../version'
import ClientPackage from './client-package'
import ClientPackageStore from './client-package-store'
import PreviewController from '../../runtime/preview/preview-controller'
import RuntimeSessionStore from '../../runtime/runtime-session-store'

const createPackage = async (options: {
  schemaGen?: number
  createdAt?: string
  bundleId?: string
} = {}) => {
  const bundleId = options.bundleId ?? 'bundle-uuid'
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
    bundle: { bundleId, id: 'desktop', launcherCount: 1, appCount: 1, resourceCount: 1 },
  }
  const module = {
    bundle: { bundleId, id: 'desktop', launcherIds: ['launcher-id'] },
    launchers: [launcher], apps: [app], common: null, resources: [resource],
  }
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest))
  zip.file('module.json', JSON.stringify(module))
  return zip.generateAsync({ type: 'uint8array' })
}

afterEach(() => {
  PreviewController.close()
  ClientPackageStore.reset()
})

describe('ClientPackage', () => {
  it('loads a compatible mbcapp and resolves Launcher dependencies', async () => {
    const parsed = await ClientPackage.parse('sample.mbcapp', await createPackage())
    const installed = (await ClientPackageStore.install(parsed)).installedPackage
    const analysis = ClientPackage.analyzeLauncher(installed, 'launcher-id')

    expect(parsed.manifest.bundle).toMatchObject({ id: 'desktop', launcherCount: 1 })
    expect(parsed.archiveBytes.byteLength).toBeGreaterThan(0)
    expect(analysis.errors).toEqual([])
    expect(analysis.apps.map((app) => app.element.id)).toEqual(['sample-app'])
    expect(analysis.resources.map((resource) => resource.element.id)).toEqual(['workspace'])
  })

  it('creates a runtime project containing packaged launch dependencies', async () => {
    const parsed = await ClientPackage.parse('sample.mbcapp', await createPackage())
    const installed = (await ClientPackageStore.install(parsed)).installedPackage
    const project = ClientPackage.createRuntimeProject(installed)

    expect(project.element.kind).toBe('project')
    expect(project.children.map((child) => child.element.kind)).toEqual([
      'app',
      'launcher',
      'directory-resource',
    ])
    expect(project.children.find((child) => child.element.kind === 'app')).toBe(installed.module.apps[0])
  })

  it('opens a packaged Launcher in the shared runtime session', async () => {
    const parsed = await ClientPackage.parse('sample.mbcapp', await createPackage())
    const installed = (await ClientPackageStore.install(parsed)).installedPackage
    const launcher = installed.module.launchers[0]
    if (launcher?.appId == null) throw new Error('Test Launcher is incomplete.')
    const project = ClientPackage.createRuntimeProject(installed)

    expect(PreviewController.open({
      projectNode: project,
      appDefinitionId: launcher.appId,
      launcherId: launcher.launcherId,
      resourcePaths: { 'resource-id': 'C:\\client-workspace' },
    })).toBe(true)
    expect(get(RuntimeSessionStore.store)).toMatchObject({
      projectNode: project,
      launcherId: 'launcher-id',
      app: { kind: 'app', appId: 'app-id' },
    })
  })

  it('rejects incompatible schema generations before installation', async () => {
    await expect(ClientPackage.parse('future.mbcapp', await createPackage({ schemaGen: SCHEMA_GEN + 1 })))
      .rejects.toThrow('not compatible')
    expect(get(ClientPackageStore.value).packages).toEqual([])
  })

  it('selects an existing installation for duplicate package bytes', async () => {
    const bytes = await createPackage()
    const first = await ClientPackageStore.install(await ClientPackage.parse('sample.mbcapp', bytes))
    const duplicate = await ClientPackageStore.install(await ClientPackage.parse('copy.mbcapp', bytes))

    expect(first.status).toBe('installed')
    expect(duplicate.status).toBe('duplicate')
    expect(get(ClientPackageStore.value).packages).toHaveLength(1)
    expect(get(ClientPackageStore.value).selectedId).toBe(first.installedPackage.installationId)
  })

  it('updates the same Bundle while preserving its installation settings', async () => {
    const first = (await ClientPackageStore.install(await ClientPackage.parse(
      'sample.mbcapp',
      await createPackage({ createdAt: '2026-09-07T00:00:00.000Z' }),
    ))).installedPackage
    ClientPackageStore.rename(first.installationId, 'Production')
    ClientPackageStore.setResourcePath(first.installationId, 'resource-id', 'C:\\data')

    const result = await ClientPackageStore.install(await ClientPackage.parse(
      'sample-v2.mbcapp',
      await createPackage({ createdAt: '2026-09-08T00:00:00.000Z' }),
    ))

    expect(result.status).toBe('updated')
    expect(result.installedPackage).toMatchObject({
      installationId: first.installationId,
      displayName: 'Production',
      sourceFileName: 'sample-v2.mbcapp',
      resourcePaths: { 'resource-id': 'C:\\data' },
    })
    expect(get(ClientPackageStore.value).packages).toHaveLength(1)
  })

  it('keeps display name and resource path as installation settings', async () => {
    const installed = (await ClientPackageStore.install(
      await ClientPackage.parse('sample.mbcapp', await createPackage()),
    )).installedPackage

    expect(ClientPackageStore.rename(installed.installationId, 'Production')).toBe(true)
    ClientPackageStore.setResourcePath(installed.installationId, 'resource-id', 'C:\\data')

    expect(ClientPackageStore.find(installed.installationId)).toMatchObject({
      displayName: 'Production',
      sourceFileName: 'sample.mbcapp',
      resourcePaths: { 'resource-id': 'C:\\data' },
    })
  })

  it('toggles package selection off and back on', async () => {
    const installed = (await ClientPackageStore.install(
      await ClientPackage.parse('sample.mbcapp', await createPackage()),
    )).installedPackage

    expect(get(ClientPackageStore.value).selectedId).toBe(installed.installationId)
    ClientPackageStore.toggleSelection(installed.installationId)
    expect(get(ClientPackageStore.value).selectedId).toBeNull()
    ClientPackageStore.toggleSelection(installed.installationId)
    expect(get(ClientPackageStore.value).selectedId).toBe(installed.installationId)
  })

  it('returns to no selection when the selected package is removed', async () => {
    const first = (await ClientPackageStore.install(
      await ClientPackage.parse('first.mbcapp', await createPackage({ createdAt: '2026-09-07T00:00:00.000Z' })),
    )).installedPackage
    await ClientPackageStore.install(
      await ClientPackage.parse('second.mbcapp', await createPackage({
        createdAt: '2026-09-08T00:00:00.000Z',
        bundleId: 'bundle-uuid-2',
      })),
    )
    ClientPackageStore.toggleSelection(first.installationId)

    await ClientPackageStore.remove(first.installationId)

    expect(get(ClientPackageStore.value)).toMatchObject({ selectedId: null })
    expect(get(ClientPackageStore.value).packages).toHaveLength(1)
  })
})
