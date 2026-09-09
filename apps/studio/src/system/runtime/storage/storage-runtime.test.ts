import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import StorageRuntime from './storage-runtime'

const node = (id: number, element: TreeNode.Node['element'], children: TreeNode.Node[] = []): TreeNode.Node => ({
  id, element, isOpen: true, children,
})

const createProject = (): { root: TreeNode.Node; app: TreeNode.Node } => {
  const app = node(2, { kind: 'app', appId: 'app-uuid', id: 'main' }, [
    node(3, { kind: 'imports' }, [
      node(4, { kind: 'storage-imports', storageIds: ['settings-uuid'] }),
    ]),
  ])
  return {
    app,
    root: node(1, { kind: 'project', projectId: 'project-uuid' }, [
      app,
      node(5, { kind: 'storage' }, [
        node(6, {
          kind: 'key-value', storageId: 'settings-uuid', id: 'settings',
          valueType: { type: 'number' }, nullable: false, initial: { type: 'literal', value: '22' },
        }),
      ]),
    ]),
  }
}

describe('StorageRuntime', () => {
  it('reads through the backend on every get and writes only through set', async () => {
    const { root, app } = createProject()
    const invoke = vi.fn().mockResolvedValueOnce(22).mockResolvedValueOnce(24).mockResolvedValue(undefined)
    const session = new StorageRuntime.Session(root, { kind: 'development', id: 'project-uuid' }, { invoke })
    const settings = session.getNamespace(app).keyValue.settings

    await expect(settings.get()).resolves.toBe(22)
    await expect(settings.get()).resolves.toBe(24)
    await settings.set(26)

    expect(invoke).toHaveBeenNthCalledWith(1, 'storage_get', {
      request: { scope: { kind: 'development', id: 'project-uuid' }, storageId: 'settings-uuid', initial: 22 },
    })
    expect(invoke).toHaveBeenNthCalledWith(3, 'storage_set', {
      request: { scope: { kind: 'development', id: 'project-uuid' }, storageId: 'settings-uuid', value: 26 },
    })
  })

  it('rejects values JSON cannot safely persist', async () => {
    const { root, app } = createProject()
    const invoke = vi.fn()
    const namespace = new StorageRuntime.Session(root, { kind: 'development', id: 'project-uuid' }, { invoke })
      .getNamespace(app).keyValue
    const settings = namespace.settings
    await expect(settings.set(Number.NaN)).rejects.toThrow('finite')
    await expect(settings.set(1n)).rejects.toThrow('JSON-compatible')
    expect(invoke).not.toHaveBeenCalled()
  })
})
