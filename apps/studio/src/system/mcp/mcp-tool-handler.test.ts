import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import McpSessionState from './mcp-session-state'

const tauriMcp = vi.hoisted(() => ({
  onRequest: vi.fn(),
  respond: vi.fn(),
}))

const confirmDialogController = vi.hoisted(() => ({ openNotice: vi.fn() }))
const toastController = vi.hoisted(() => ({ show: vi.fn() }))

const treeStore = vi.hoisted(() => {
  class RevisionConflictError extends Error {
    readonly code = 'REVISION_CONFLICT'
    constructor(readonly expectedRevision: number, readonly actualRevision: number) {
      super(`Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`)
    }
  }
  let nextNodeId = 10
  const createNode = (seed: { element: Record<string, any>; children?: Array<Record<string, any>>; isOpen?: boolean }) => ({
    id: nextNodeId++,
    element: seed.element,
    children: seed.children ?? [],
    isOpen: seed.isOpen ?? true,
  })
  const rootNode = { value: { id: 1, element: { kind: 'tag', tagName: 'div', comment: '', styles: [], attributes: [] }, children: [], isOpen: true } as Record<string, any>, subscribe: (run: (value: unknown) => void) => { run(rootNode.value); return () => {} } }
  const revision = { value: 0, subscribe: (run: (value: unknown) => void) => { run(revision.value); return () => {} } }
  const transformNode = vi.fn((nodeId: number, transform: (node: Record<string, any>, createNode: unknown) => boolean) => (
    nodeId === rootNode.value.id ? transform(rootNode.value, createNode) : false
  ))
  const findNode = (node: Record<string, any>, nodeId: number): Record<string, any> | null => {
    if (node.id === nodeId) return node
    for (const child of node.children) {
      const found = findNode(child, nodeId)
      if (found != null) return found
    }
    return null
  }
  const addChildAndGetId = vi.fn((parentNodeId: number, element: Record<string, any>, index?: number) => {
    const parent = findNode(rootNode.value, parentNodeId)
    if (parent == null) throw new Error(`Parent node ${parentNodeId} was not found.`)
    const child = createNode({ element })
    if (index == null) parent.children.push(child)
    else parent.children.splice(index, 0, child)
    return child.id
  })
  const transaction = vi.fn((options: { expectedRevision?: number }, callback: () => unknown) => {
    if (options.expectedRevision != null && options.expectedRevision !== revision.value) {
      throw new RevisionConflictError(options.expectedRevision, revision.value)
    }
    const previousSnapshot = JSON.stringify(rootNode.value)
    const result = callback()
    const changed = JSON.stringify(rootNode.value) !== previousSnapshot
    if (changed) revision.value += 1
    return { result, changed }
  })
  return {
    rootNode,
    selectedNodeId: { value: 1, subscribe: (run: (value: unknown) => void) => { run(1); return () => {} } },
    revision,
    onLifecycle: vi.fn(() => vi.fn()),
    transaction,
    transformNode,
    addChildAndGetId,
    RevisionConflictError,
    resetNodeIds: () => { nextNodeId = 10 },
  }
})

vi.mock('@system/infra/tauri/mcp', () => ({ default: tauriMcp }))
vi.mock('@system/ui/feedback/confirm/confirm-dialog-controller', () => ({ default: confirmDialogController }))
vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: toastController }))
vi.mock('@system/workspace/tree/state', () => ({ default: treeStore }))
vi.mock('@system/workspace/element-definition/element-registry', () => ({
  default: {
    get: vi.fn((kind: string) => ({
      canDisable: true,
      contentHost: ['tag', 'loop', 'if', 'else-if', 'else', 'case', 'default', 'slot-content'].includes(kind)
        ? { retention: 'optional' }
        : undefined,
    })),
  },
}))
vi.mock('@system/project/project-session-store', () => ({
  default: { store: { value: { isDirty: true, savedFingerprint: 'saved' }, subscribe: (run: (value: unknown) => void) => { run({ isDirty: true, savedFingerprint: 'saved' }); return () => {} } } },
}))

import McpToolHandler from './mcp-tool-handler'

describe('McpToolHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    McpSessionState.set('available')
    McpSessionState.detailsStore.set({
      sessionId: 'test-session',
      endpoint: 'http://127.0.0.1:12345',
      pid: 123,
    })
    tauriMcp.respond.mockResolvedValue(undefined)
    treeStore.resetNodeIds()
    treeStore.rootNode.value = { id: 1, element: { kind: 'tag', tagName: 'div', comment: '', styles: [], attributes: [] }, children: [], isOpen: true }
    treeStore.revision.value = 0
  })

  it('answers bridge ping through the WebView handler', async () => {
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({ id: 'request-1', method: 'ping', params: {} })

    expect(tauriMcp.respond).toHaveBeenCalledWith({
      id: 'request-1',
      result: { application: 'Mebaco Studio', status: 'ready' },
    })
    expect(get(McpSessionState.store)).toBe('available')
  })

  it('returns a structured error for unsupported methods', async () => {
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({ id: 'request-2', method: 'unknown', params: null })

    expect(tauriMcp.respond).toHaveBeenCalledWith({
      id: 'request-2',
      error: {
        code: 'METHOD_NOT_FOUND',
        message: 'Unsupported Studio bridge method: unknown',
      },
    })
  })

  it('shows an agent message in the Studio GUI', async () => {
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({
      id: 'request-3',
      method: 'showMessage',
      params: { message: 'Hello from Codex' },
    })

    expect(confirmDialogController.openNotice).toHaveBeenCalledWith({
      title: 'MCP message',
      message: 'Hello from Codex',
    })
    expect(tauriMcp.respond).toHaveBeenCalledWith({
      id: 'request-3',
      result: { displayed: true },
    })
  })

  it('returns the live project summary', async () => {
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({ id: 'request-4', method: 'getProjectSummary', params: {} })

    expect(tauriMcp.respond).toHaveBeenCalledWith({
      id: 'request-4',
      result: expect.objectContaining({ nodeCount: 1, dirty: true, revision: 0 }),
    })
  })

  it('updates disabled state with an expected revision', async () => {
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({
      id: 'request-5',
      method: 'setNodeDisabled',
      params: { nodeId: 1, expectedRevision: 0, disabled: true, dryRun: false },
    })

    expect(treeStore.rootNode.value.disabled).toBe(true)
    expect(tauriMcp.respond).toHaveBeenCalledWith({
      id: 'request-5',
      result: expect.objectContaining({
        changed: true,
        previousRevision: 0,
        revision: 1,
        disabled: true,
      }),
    })
    expect(toastController.show).toHaveBeenCalledWith('エージェントにより変更が適用されました')
  })

  it('returns REVISION_CONFLICT without changing the node', async () => {
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })
    treeStore.revision.value = 2

    await McpToolHandler.connect()
    await handler?.({
      id: 'request-6',
      method: 'setNodeDisabled',
      params: { nodeId: 1, expectedRevision: 1, disabled: true },
    })

    expect(treeStore.rootNode.value.disabled).toBeUndefined()
    expect(tauriMcp.respond).toHaveBeenCalledWith({
      id: 'request-6',
      error: expect.objectContaining({
        code: 'REVISION_CONFLICT',
        expectedRevision: 1,
        actualRevision: 2,
      }),
    })
  })

  it('uses and removes Retention through the shared ContentHost mutation', async () => {
    treeStore.rootNode.value.children = [{
      id: 2,
      element: { kind: 'text', source: { type: 'literal', value: 'Todo' } },
      children: [],
      isOpen: true,
    }]

    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({
      id: 'request-7-enable',
      method: 'applyChanges',
      params: {
        expectedRevision: 0,
        operations: [{ type: 'setContentHostRetention', nodeId: 1, enabled: true }],
      },
    })

    expect(treeStore.rootNode.value.children.map((node: Record<string, any>) => node.element.kind)).toEqual(['retention', 'elements'])
    expect(treeStore.rootNode.value.children[1].children.map((node: Record<string, any>) => node.id)).toEqual([2])
    expect(tauriMcp.respond).toHaveBeenLastCalledWith({
      id: 'request-7-enable',
      result: expect.objectContaining({ changed: true, previousRevision: 0, revision: 1 }),
    })

    await handler?.({
      id: 'request-7-disable',
      method: 'applyChanges',
      params: {
        expectedRevision: 1,
        operations: [{ type: 'setContentHostRetention', nodeId: 1, enabled: false }],
      },
    })

    expect(treeStore.rootNode.value.children.map((node: Record<string, any>) => node.id)).toEqual([2])
    expect(tauriMcp.respond).toHaveBeenLastCalledWith({
      id: 'request-7-disable',
      result: expect.objectContaining({ changed: true, previousRevision: 1, revision: 2 }),
    })
  })

  it('supports every optional Retention content-host kind exposed by the registry', async () => {
    const optionalKinds = ['tag', 'loop', 'if', 'else-if', 'else', 'case', 'default', 'slot-content']
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    for (const kind of optionalKinds) {
      treeStore.rootNode.value = {
        id: 1,
        element: kind === 'tag'
          ? { kind, tagName: 'div', comment: '', styles: [], attributes: [] }
          : { kind },
        children: [{
          id: 2,
          element: { kind: 'text', source: { type: 'literal', value: 'content' } },
          children: [],
          isOpen: true,
        }],
        isOpen: true,
      }
      treeStore.revision.value = 0

      await handler?.({
        id: `request-enable-${kind}`,
        method: 'applyChanges',
        params: {
          expectedRevision: 0,
          operations: [{ type: 'setContentHostRetention', nodeId: 1, enabled: true }],
        },
      })
      expect(treeStore.rootNode.value.children.map((node: Record<string, any>) => node.element.kind)).toEqual(['retention', 'elements'])

      await handler?.({
        id: `request-disable-${kind}`,
        method: 'applyChanges',
        params: {
          expectedRevision: 1,
          operations: [{ type: 'setContentHostRetention', nodeId: 1, enabled: false }],
        },
      })
      expect(treeStore.rootNode.value.children.map((node: Record<string, any>) => node.id)).toEqual([2])
    }
  })

  it('rejects removing a Retention branch that contains nodes', async () => {
    treeStore.rootNode.value.children = [
      {
        id: 3,
        element: { kind: 'retention' },
        children: [{
          id: 4,
          element: { kind: 'text', source: { type: 'literal', value: 'local' } },
          children: [],
          isOpen: true,
        }],
        isOpen: true,
      },
      { id: 5, element: { kind: 'elements' }, children: [], isOpen: true },
    ]

    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({
      id: 'request-8',
      method: 'applyChanges',
      params: {
        expectedRevision: 0,
        operations: [{ type: 'setContentHostRetention', nodeId: 1, enabled: false }],
      },
    })

    expect(treeStore.revision.value).toBe(0)
    expect(treeStore.rootNode.value.children).toHaveLength(2)
    expect(tauriMcp.respond).toHaveBeenLastCalledWith({
      id: 'request-8',
      error: expect.objectContaining({
        code: 'EDIT_NOT_SUPPORTED',
        message: expect.stringContaining('must be empty before it can be removed'),
      }),
    })
  })

  it('creates the initial supported Retention declarations through applyChanges', async () => {
    treeStore.rootNode.value = {
      id: 1,
      element: { kind: 'component', id: 'Main', componentId: 'main' },
      children: [{ id: 2, element: { kind: 'retention' }, children: [], isOpen: true }],
      isOpen: true,
    }
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({
      id: 'request-retention-create',
      method: 'applyChanges',
      params: {
        expectedRevision: 0,
        operations: [
          { type: 'createVariable', parentNodeId: 2, id: 'count', source: '0' },
          { type: 'createAction', parentNodeId: 2, comment: 'initialize', source: '' },
          { type: 'createFunction', parentNodeId: 2, id: 'format', implementationMode: 'code', source: 'return String(value)' },
          { type: 'createLocalComponent', parentNodeId: 2, id: 'Item' },
        ],
      },
    })

    expect(treeStore.rootNode.value.children[0].children.map((node: Record<string, any>) => node.element.kind)).toEqual([
      'variable', 'action', 'function', 'component',
    ])
    expect(treeStore.rootNode.value.children[0].children[3].element).toEqual(expect.objectContaining({
      id: 'Item', local: true,
    }))
    expect(tauriMcp.respond).toHaveBeenLastCalledWith({
      id: 'request-retention-create',
      result: expect.objectContaining({ changed: true, previousRevision: 0, revision: 1 }),
    })
  })

  it('rejects Retention declarations outside Retention and rolls back the transaction', async () => {
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({
      id: 'request-retention-invalid-parent',
      method: 'applyChanges',
      params: {
        expectedRevision: 0,
        operations: [{ type: 'createVariable', parentNodeId: 1, id: 'count', source: '0' }],
      },
    })

    expect(treeStore.rootNode.value.children).toHaveLength(0)
    expect(treeStore.revision.value).toBe(0)
    expect(tauriMcp.respond).toHaveBeenLastCalledWith({
      id: 'request-retention-invalid-parent',
      error: expect.objectContaining({ code: 'EDIT_NOT_SUPPORTED' }),
    })
  })

  it('rejects rendered nodes in Retention', async () => {
    treeStore.rootNode.value = {
      id: 1,
      element: { kind: 'component', id: 'Main', componentId: 'main' },
      children: [{ id: 2, element: { kind: 'retention' }, children: [], isOpen: true }],
      isOpen: true,
    }
    let handler: ((request: unknown) => Promise<void>) | undefined
    tauriMcp.onRequest.mockImplementation((candidate) => {
      handler = candidate
      return Promise.resolve(vi.fn())
    })

    await McpToolHandler.connect()
    await handler?.({
      id: 'request-retention-rendered-node',
      method: 'applyChanges',
      params: {
        expectedRevision: 0,
        operations: [{ type: 'insertNode', parentNodeId: 2, kind: 'text', value: 'invalid' }],
      },
    })

    expect(treeStore.rootNode.value.children[0].children).toHaveLength(0)
    expect(tauriMcp.respond).toHaveBeenLastCalledWith({
      id: 'request-retention-rendered-node',
      error: expect.objectContaining({
        code: 'EDIT_NOT_SUPPORTED',
        message: expect.stringContaining('paired Elements branch'),
      }),
    })
  })
})
