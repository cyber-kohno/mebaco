import { describe, expect, it, vi } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import ResourceRuntime from './resource-runtime'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

const createProject = (): TreeNode.Node => node(1, { kind: 'project' }, [
  node(2, { kind: 'common' }, [
    node(3, { kind: 'resources' }, [
      node(4, {
        kind: 'directory-resource',
        resourceId: 'workspace-id',
        id: 'workspace',
        permissions: {
          access: 'read-write',
          deleteFile: false,
          text: { access: 'read', pattern: '**/*.txt' },
          sqlite: { access: 'read-write', pattern: '**/*.db', create: true },
        },
      }),
      node(5, {
        kind: 'text-resource',
        resourceId: 'settings-id',
        id: 'settings',
        access: 'read-write',
      }),
    ]),
  ]),
  node(6, { kind: 'debug' }, [
    node(7, { kind: 'debug-configurations' }, [
      node(8, {
        kind: 'debug-configuration',
        configurationId: 'first-id',
        role: 'custom',
        name: 'First',
      }, [
        node(9, { kind: 'debug-resource-bindings', bindings: [
          { resourceId: 'workspace-id', path: 'C:\\workspace-first' },
          { resourceId: 'settings-id', path: 'C:\\settings-first.txt' },
        ] }),
      ]),
      node(10, {
        kind: 'debug-configuration',
        configurationId: 'second-id',
        role: 'custom',
        name: 'Second',
      }, [
        node(11, { kind: 'debug-resource-bindings', bindings: [
          { resourceId: 'workspace-id', path: 'C:\\workspace-second' },
          { resourceId: 'settings-id', path: 'C:\\settings-second.txt' },
        ] }),
      ]),
    ]),
  ]),
])

describe('ResourceRuntime', () => {
  it('uses the first Configuration and registers lazily on the first physical operation', async () => {
    const calls: Array<{ command: string; request: unknown }> = []
    const backend: ResourceRuntime.Backend = {
      invoke: async <T>(command: string, args: { request: unknown }): Promise<T> => {
        calls.push({ command, request: args.request })
        return (command === 'resource_read_text' ? 'hello' : undefined) as T
      },
    }
    const session = ResourceRuntime.create(createProject(), backend)
    const resources = session.namespace as {
      workspace: { text: (path: string) => { read: () => Promise<string> } }
    }

    const text = resources.workspace.text('docs/readme.txt')
    expect(calls).toHaveLength(0)
    await expect(text.read()).resolves.toBe('hello')

    expect(calls[0].command).toBe('resource_create_session')
    expect(calls[0].request).toMatchObject({
      resources: expect.arrayContaining([
        expect.objectContaining({ resourceId: 'workspace-id', path: 'C:\\workspace-first' }),
        expect.objectContaining({ resourceId: 'settings-id', path: 'C:\\settings-first.txt' }),
      ]),
    })
    expect(calls[1]).toMatchObject({
      command: 'resource_read_text',
      request: expect.objectContaining({
        resourceId: 'workspace-id',
        relativePath: 'docs/readme.txt',
      }),
    })
  })

  it('rejects invalid and disallowed derived paths synchronously', () => {
    const backend: ResourceRuntime.Backend = { invoke: vi.fn() }
    const session = ResourceRuntime.create(createProject(), backend)
    const workspace = session.namespace.workspace as {
      text: (path: string) => unknown
      sqlite: (path: string) => unknown
    }

    expect(() => workspace.text('../secret.txt')).toThrow('Invalid relative Resource path')
    expect(() => workspace.text('data/value.json')).toThrow('is not allowed by pattern')
    expect(() => workspace.sqlite('data/manage.db')).not.toThrow()
    expect(backend.invoke).not.toHaveBeenCalled()
  })

  it('exposes runtime methods according to Resource permissions', () => {
    const session = ResourceRuntime.create(createProject(), { invoke: vi.fn() })
    const workspace = session.namespace.workspace as Record<string, unknown>
    const settings = session.namespace.settings as Record<string, unknown>

    expect(Object.keys(workspace)).toEqual(expect.arrayContaining([
      'exists', 'list', 'renameFile', 'copyFile', 'createDir', 'createFile', 'text', 'sqlite',
    ]))
    expect(workspace).not.toHaveProperty('deleteFile')
    expect(settings).toHaveProperty('read')
    expect(settings).toHaveProperty('write')
  })
})
