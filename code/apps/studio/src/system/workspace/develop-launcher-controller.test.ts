import { afterEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import type TreeNode from '@system/model/tree/tree-node'
import PreviewController from '@system/runtime/preview/preview-controller'
import RuntimeSessionStore from '@system/runtime/runtime-session-store'
import RuntimeLaunch from '@system/runtime/runtime-launch'
import FormulaContext from '@system/runtime/formula/formula-context'
import DevelopLauncherController from './develop-launcher-controller'

const backend = vi.hoisted(() => ({ invoke: vi.fn(async () => undefined) }))
vi.mock('@tauri-apps/api/core', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tauri-apps/api/core')>(),
  invoke: backend.invoke,
}))

const node = (id: number, element: TreeNode.Node['element'], children: TreeNode.Node[] = []): TreeNode.Node => ({
  id, element, children, isOpen: true,
})
const fixture = () => node(1, { kind: 'project', projectId: 'project-uuid' }, [
  node(2, { kind: 'app', appId: 'app-uuid', id: 'latest-app' }, [
    node(3, { kind: 'entry', componentId: 'view-uuid', propBindings: [] }),
    node(4, { kind: 'component', componentId: 'view-uuid', id: 'Main' }),
    node(5, { kind: 'launch-options' }, [node(6, { kind: 'launch-arguments' }, [
      node(7, { kind: 'launch-argument', propId: 'argument-uuid', id: 'environment', valueType: { type: 'string' }, nullable: false }),
    ])]),
    node(8, { kind: 'imports' }, [node(9, { kind: 'storage-imports', storageIds: ['settings-uuid'] })]),
  ]),
  node(10, { kind: 'launchers' }, [
    node(11, {
      kind: 'launcher', launcherId: 'launcher-uuid', id: 'daily', name: 'Daily tool', appId: 'app-uuid',
      argumentBindings: [{ propId: 'argument-uuid', kind: 'value', source: { type: 'literal', value: 'development' } }],
    }),
    node(12, { kind: 'launcher', launcherId: 'unconfigured', id: 'unconfigured', appId: null, argumentBindings: [] }),
    node(13, { kind: 'launcher', launcherId: 'missing', id: 'missing', appId: 'missing-app', argumentBindings: [] }),
  ]),
  node(14, { kind: 'storage' }, [
    node(15, { kind: 'key-value', storageId: 'settings-uuid', id: 'settings', valueType: { type: 'number' }, nullable: false, initial: { type: 'literal', value: '22' } }),
  ]),
])

afterEach(() => RuntimeSessionStore.close())

describe('Development launcher execution', () => {
  it('lists every Launcher in tree order and identifies missing configuration', () => {
    const root = fixture()
    const items = DevelopLauncherController.collect(root)
    expect(items.map((item) => [item.launcher.id, item.problem])).toEqual([
      ['daily', null], ['unconfigured', 'appNotConfigured'], ['missing', 'appMissing'],
    ])
    expect(items[0]?.app?.id).toBe('latest-app')
    root.children[0]!.children.splice(0, 1)
    expect(DevelopLauncherController.collect(root)[0]?.problem).toBe('entryInvalid')
  })

  it('runs an unsaved snapshot using the selected Launcher argument bindings', () => {
    const root = fixture()
    expect(DevelopLauncherController.open(root, 11)).toBe(true)
    const session = get(RuntimeSessionStore.store)!
    expect(session.projectNode).toEqual(root)
    expect(session.projectNode).not.toBe(root)
    expect(session.presentation).toEqual({ type: 'application', title: 'Daily tool' })
    expect(RuntimeLaunch.resolve({
      appNode: session.appNode as Parameters<typeof RuntimeLaunch.resolve>[0]['appNode'],
      projectNode: session.projectNode,
      launcherId: session.launcherId,
      baseContext: FormulaContext.createEmpty(),
    })).toEqual({ values: { environment: 'development' }, errors: [] })
    const app = root.children[0]!.element
    if (app.kind === 'app') app.id = 'edited-later'
    expect(session.app.id).toBe('latest-app')
  })

  it('uses the existing persistent development Storage scope', async () => {
    DevelopLauncherController.open(fixture(), 11)
    const session = get(RuntimeSessionStore.store)!
    const storage = session.storageSession.getNamespace(session.appNode).keyValue.settings!
    await storage.get()
    await storage.set(77)
    expect(backend.invoke).toHaveBeenCalledWith('storage_get', {
      request: { scope: { kind: 'development', id: 'project-uuid' }, storageId: 'settings-uuid', initial: 22 },
    })
    expect(backend.invoke).toHaveBeenCalledWith('storage_set', {
      request: { scope: { kind: 'development', id: 'project-uuid' }, storageId: 'settings-uuid', value: 77 },
    })
  })

  it('preserves the application screen and sessions through transitions, then disposes on exit', () => {
    DevelopLauncherController.open(fixture(), 11)
    const first = get(RuntimeSessionStore.store)!
    const dispose = vi.spyOn(first.resourceSession, 'dispose')
    expect(PreviewController.transition(first.projectNode, 'app-uuid', { environment: 'next' })).toBe(true)
    const next = get(RuntimeSessionStore.store)!
    expect(next.presentation).toBe(first.presentation)
    expect(next.storageSession).toBe(first.storageSession)
    expect(next.resourceSession).toBe(first.resourceSession)
    expect(next.launchValues).toEqual({ environment: 'next' })
    expect(dispose).not.toHaveBeenCalled()
    PreviewController.close()
    expect(get(RuntimeSessionStore.store)).toBeNull()
    expect(dispose).toHaveBeenCalledOnce()
    expect(PreviewController.transition(first.projectNode, 'app-uuid', {})).toBe(false)
    expect(get(RuntimeSessionStore.store)).toBeNull()
  })

  it('rejects unavailable launchers and keeps an existing runtime intact', () => {
    const root = fixture()
    for (const id of [12, 13, 999]) expect(DevelopLauncherController.open(root, id)).toBe(false)
    expect(get(RuntimeSessionStore.store)).toBeNull()
    DevelopLauncherController.open(root, 11)
    const current = get(RuntimeSessionStore.store)
    expect(DevelopLauncherController.open(root, 11)).toBe(false)
    expect(get(RuntimeSessionStore.store)).toBe(current)
  })
})
