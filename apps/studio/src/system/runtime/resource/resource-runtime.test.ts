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

  it('uses explicit client paths instead of the development Configuration', async () => {
    const invoke = vi.fn().mockResolvedValue('hello')
    const session = ResourceRuntime.createWithPaths(createProject(), {
      'workspace-id': 'C:\\client-workspace',
      'settings-id': 'C:\\client-settings.txt',
    }, { invoke })
    const settings = session.namespace.settings as { read: () => Promise<string> }

    await expect(settings.read()).resolves.toBe('hello')

    expect(invoke).toHaveBeenNthCalledWith(1, 'resource_create_session', {
      request: expect.objectContaining({
        resources: expect.arrayContaining([
          expect.objectContaining({ resourceId: 'workspace-id', path: 'C:\\client-workspace' }),
          expect.objectContaining({ resourceId: 'settings-id', path: 'C:\\client-settings.txt' }),
        ]),
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
      'exists', 'list', 'glob', 'renameFile', 'copyFile', 'createDir', 'createFile', 'text', 'sqlite',
    ]))
    expect(workspace).not.toHaveProperty('deleteFile')
    expect(settings).toHaveProperty('read')
    expect(settings).toHaveProperty('write')
  })

  it('queries SQLite values and converts BLOB results to Uint8Array', async () => {
    const invoke = vi.fn(async <T>(command: string): Promise<T> => (
      command === 'resource_query_sqlite'
        ? [{ id: 7, name: 'sample', data: { $sqlite: 'blob', bytes: [1, 2, 255] } }]
        : undefined
    ) as T)
    const session = ResourceRuntime.create(createProject(), {
      invoke: invoke as ResourceRuntime.Backend['invoke'],
    })
    const database = (session.namespace.workspace as {
      sqlite: (path: string) => { query: (sql: string, parameters?: ResourceRuntime.SqliteParameter[]) => Promise<ResourceRuntime.SqliteRow[]> }
    }).sqlite('data/manage.db')

    const rows = await database.query('SELECT * FROM sample WHERE id = ?', [7])

    expect(rows[0]).toMatchObject({ id: 7, name: 'sample' })
    expect(rows[0].data).toEqual(new Uint8Array([1, 2, 255]))
    expect(invoke).toHaveBeenCalledWith('resource_query_sqlite', {
      request: expect.objectContaining({ sql: expect.any(String), parameters: [7] }),
    })
  })

  it('rejects unsafe SQLite integer parameters before invoking the backend', () => {
    const invoke = vi.fn()
    const session = ResourceRuntime.create(createProject(), {
      invoke: invoke as ResourceRuntime.Backend['invoke'],
    })
    const database = (session.namespace.workspace as {
      sqlite: (path: string) => { query: (sql: string, parameters?: ResourceRuntime.SqliteParameter[]) => Promise<unknown> }
    }).sqlite('data/manage.db')

    expect(() => database.query('SELECT ?', [Number.MAX_SAFE_INTEGER + 1]))
      .toThrow('safe integer range')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('rolls back an interactive SQLite transaction after inspecting updated data', async () => {
    const commands: string[] = []
    const invoke = vi.fn(async <T>(command: string): Promise<T> => {
      commands.push(command)
      if (command === 'resource_query_sqlite_transaction') return [{ stock: -1 }] as T
      if (command === 'resource_execute_sqlite_transaction') return { changes: 1, lastInsertRowId: 0 } as T
      return undefined as T
    })
    const session = ResourceRuntime.create(createProject(), {
      invoke: invoke as ResourceRuntime.Backend['invoke'],
    })
    const database = (session.namespace.workspace as {
      sqlite: (path: string) => {
        transaction: <T>(callback: (transaction: ResourceRuntime.SqliteTransaction) => Promise<T>) => Promise<T>
      }
    }).sqlite('data/manage.db')

    const result = await database.transaction(async (transaction) => {
      await transaction.execute('UPDATE inventory SET stock = stock - 1')
      const rows = await transaction.query<{ stock: number }>('SELECT stock FROM inventory')
      if (rows[0].stock < 0) transaction.rollback()
      return 'checked'
    })

    expect(result).toBe('checked')
    expect(commands).toEqual([
      'resource_create_session',
      'resource_begin_sqlite_transaction',
      'resource_execute_sqlite_transaction',
      'resource_query_sqlite_transaction',
      'resource_rollback_sqlite_transaction',
    ])
  })

  it('creates an App-scoped namespace from imported Resource ids', () => {
    const session = ResourceRuntime.create(createProject(), { invoke: vi.fn() })

    const scoped = session.getNamespace(['settings-id', 'missing-id'])

    expect(Object.keys(scoped)).toEqual(['settings'])
    expect(scoped).not.toHaveProperty('workspace')
    expect(Object.isFrozen(scoped)).toBe(true)
  })

  it('validates glob patterns before invoking the backend', async () => {
    const invoke = vi.fn().mockResolvedValue([])
    const session = ResourceRuntime.create(createProject(), { invoke })
    const workspace = session.namespace.workspace as {
      glob: (pattern: string) => Promise<ResourceRuntime.DirectoryEntry[]>
    }

    expect(() => workspace.glob('../**/*.java')).toThrow('Invalid Resource glob pattern')
    expect(() => workspace.glob('src\\**\\*.java')).toThrow('Invalid Resource glob pattern')
    expect(invoke).not.toHaveBeenCalled()

    await expect(workspace.glob('src/**/*.java')).resolves.toEqual([])
    expect(invoke).toHaveBeenLastCalledWith('resource_glob', {
      request: expect.objectContaining({
        resourceId: 'workspace-id',
        pattern: 'src/**/*.java',
      }),
    })
  })
})
