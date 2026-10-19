import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import type TreeNode from '@system/model/tree/tree-node'
import RuntimeSessionStore from '@system/runtime/runtime-session-store'
import RuntimePreviewProbe from '@system/runtime/preview/runtime-preview-probe'
import PreviewController from '@system/runtime/preview/preview-controller'

const tree = vi.hoisted(() => {
  const store = <T,>(value: T) => ({ value, subscribe(run: (value: T) => void) { run(this.value); return () => {} } })
  return { rootNode: store<unknown>(null), revision: store(0) }
})
vi.mock('@system/workspace/tree/state', () => ({ default: tree }))
import McpPreviewController from './mcp-preview-controller'

const node = (id: number, element: TreeNode.Node['element'], children: TreeNode.Node[] = []): TreeNode.Node => ({ id, element, children, isOpen: true })
const fixture = () => node(1, { kind: 'project' }, [
  node(2, { kind: 'app', appId: 'app-id', id: 'main' }, [
    node(3, { kind: 'entry', componentId: 'view-id', propBindings: [] }),
    node(4, { kind: 'component', id: 'Main', componentId: 'view-id' }, [node(5, { kind: 'elements' })]),
    node(6, { kind: 'imports' }, [node(7, { kind: 'storage-imports', storageIds: ['settings-id'] })]),
  ]),
  node(8, { kind: 'storage' }, [node(9, { kind: 'key-value', storageId: 'settings-id', id: 'settings', valueType: { type: 'number' }, nullable: false, initial: { type: 'literal', value: '22' } })]),
  node(10, { kind: 'text-resource', resourceId: 'text-id', id: 'file', access: 'read-write' }),
  node(11, { kind: 'debug-configurations' }, [node(12, { kind: 'debug-configuration', configurationId: 'debug-id', role: 'custom', name: 'Test' }, [
    node(13, { kind: 'debug-resource-bindings', bindings: [{ resourceId: 'text-id', path: 'C:\\unused.txt' }] }),
  ])]),
])

describe('McpPreviewController', () => {
  beforeEach(() => {
    RuntimeSessionStore.close()
    tree.rootNode.value = fixture()
    tree.revision.value = 0
    vi.spyOn(RuntimePreviewProbe.Session.prototype, 'settle').mockResolvedValue(true)
    vi.spyOn(RuntimePreviewProbe.Session.prototype, 'snapshot').mockImplementation(function (this: RuntimePreviewProbe.Session) {
      return { previewId: this.previewId } as ReturnType<RuntimePreviewProbe.Session['snapshot']>
    })
  })
  const start = async () => await McpPreviewController.handle('startPreview', { appId: 'app-id', expectedRevision: 0 }) as { previewId: string; stale: boolean }

  it('uses an unsaved model snapshot without changing the model or revision', async () => {
    const root = tree.rootNode.value
    const result = await start()
    expect(get(RuntimeSessionStore.store)?.projectNode).toEqual(root)
    expect(get(RuntimeSessionStore.store)?.projectNode).not.toBe(root)
    expect(tree.rootNode.value).toBe(root)
    expect(tree.revision.value).toBe(0)
    expect(result.stale).toBe(false)
  })

  it('isolates key-value storage and resets it for the next preview', async () => {
    const first = await start()
    const session = get(RuntimeSessionStore.store)!
    const item = session.storageSession.getNamespace(session.appNode).keyValue.settings!
    expect(await item.get()).toBe(22)
    await item.set(77)
    expect(await item.get()).toBe(77)
    await McpPreviewController.handle('closePreview', first)
    await start()
    const next = get(RuntimeSessionStore.store)!
    expect(await next.storageSession.getNamespace(next.appNode).keyValue.settings!.get()).toBe(22)
  })

  it('blocks physical resource I/O', async () => {
    await start()
    const resource = get(RuntimeSessionStore.store)!.resourceSession.namespace.file as { read: () => Promise<string>; write: (value: string) => Promise<void> }
    await expect(resource.read()).rejects.toThrow('Resource I/O is disabled')
    await expect(resource.write('test')).rejects.toThrow('Resource I/O is disabled')
  })

  it('never replaces or closes a manual preview', async () => {
    PreviewController.open({ projectNode: fixture(), appDefinitionId: 'app-id' })
    const manual = get(RuntimeSessionStore.store)
    await expect(start()).rejects.toMatchObject({ code: 'PREVIEW_ALREADY_OPEN' })
    await expect(McpPreviewController.handle('closePreview', { previewId: 'anything' })).rejects.toMatchObject({ code: 'PREVIEW_NOT_AVAILABLE' })
    expect(get(RuntimeSessionStore.store)).toBe(manual)
  })

  it('reports stale reads but rejects actions after a project edit', async () => {
    const result = await start()
    tree.revision.value = 1
    await expect(McpPreviewController.handle('inspectPreview', result)).resolves.toMatchObject({ stale: true, revision: 0, currentRevision: 1 })
    await expect(McpPreviewController.handle('interactPreview', { ...result, action: 'click', elementId: 'id' })).rejects.toMatchObject({ code: 'STALE_PREVIEW' })
    await expect(McpPreviewController.handle('closePreview', result)).resolves.toMatchObject({ closed: true })
  })

  it('validates limits and input values before executing handlers', async () => {
    await expect(McpPreviewController.handle('startPreview', { appId: 'app-id', expectedRevision: 1 })).rejects.toMatchObject({ code: 'REVISION_CONFLICT' })
    await expect(McpPreviewController.handle('startPreview', { appId: 'app-id', expectedRevision: 0, timeoutMs: 2001 })).rejects.toMatchObject({ code: 'INVALID_PARAMS' })
    const result = await start()
    for (const params of [
      { maxElements: 501 }, { maxTextLength: 0 }, { action: 'executeScript', elementId: 'id' },
      { action: 'input', elementId: 'id' }, { action: 'input', elementId: 'id', value: 'x'.repeat(64001) },
      { action: 'scroll', elementId: 'id', scrollTop: Number.NaN },
    ]) {
      await expect(McpPreviewController.handle('interactPreview', { ...result, ...params })).rejects.toMatchObject({ code: 'INVALID_PARAMS' })
    }
  })

  it('returns unsettled rather than claiming asynchronous work completed', async () => {
    vi.mocked(RuntimePreviewProbe.Session.prototype.settle).mockResolvedValue(false)
    await expect(start()).resolves.toMatchObject({ settled: false })
  })

  it('returns the preview ID even if the runtime view is not ready', async () => {
    vi.mocked(RuntimePreviewProbe.Session.prototype.snapshot).mockImplementation(() => {
      throw new RuntimePreviewProbe.Error('PREVIEW_NOT_READY', 'Still mounting.')
    })
    const result = await start()
    expect(result).toMatchObject({ ready: false, settled: false })
    expect(typeof result.previewId).toBe('string')
    await expect(McpPreviewController.handle('closePreview', result)).resolves.toMatchObject({ closed: true })
  })

  it('rejects overlapping preview requests and releases its lock', async () => {
    let release!: (value: boolean) => void
    vi.mocked(RuntimePreviewProbe.Session.prototype.settle).mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))
    const pending = start()
    await expect(start()).rejects.toMatchObject({ code: 'PREVIEW_BUSY' })
    release(true)
    const result = await pending
    await expect(McpPreviewController.handle('closePreview', result)).resolves.toMatchObject({ closed: true })
  })

  it('cleans up a failed start and allows the next request', async () => {
    await expect(McpPreviewController.handle('startPreview', { appId: 'missing', expectedRevision: 0 })).rejects.toMatchObject({ code: 'PREVIEW_START_FAILED' })
    expect(get(RuntimeSessionStore.store)).toBe(null)
    await expect(start()).resolves.toMatchObject({ stale: false })
  })
})
