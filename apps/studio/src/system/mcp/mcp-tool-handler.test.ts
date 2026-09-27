import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import McpSessionState from './mcp-session-state'

const tauriMcp = vi.hoisted(() => ({
  onRequest: vi.fn(),
  respond: vi.fn(),
}))

const confirmDialogController = vi.hoisted(() => ({ openNotice: vi.fn() }))

const treeStore = vi.hoisted(() => {
  class RevisionConflictError extends Error {
    readonly code = 'REVISION_CONFLICT'
    constructor(readonly expectedRevision: number, readonly actualRevision: number) {
      super(`Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`)
    }
  }
  const rootNode = { value: { id: 1, element: { kind: 'tag' }, children: [], isOpen: true } as Record<string, any>, subscribe: (run: (value: unknown) => void) => { run(rootNode.value); return () => {} } }
  const revision = { value: 0, subscribe: (run: (value: unknown) => void) => { run(revision.value); return () => {} } }
  const transformNode = vi.fn((nodeId: number, transform: (node: Record<string, any>) => boolean) => (
    nodeId === rootNode.value.id ? transform(rootNode.value) : false
  ))
  const transaction = vi.fn((options: { expectedRevision?: number }, callback: () => unknown) => {
    if (options.expectedRevision != null && options.expectedRevision !== revision.value) {
      throw new RevisionConflictError(options.expectedRevision, revision.value)
    }
    const changed = callback() === true
    if (changed) revision.value += 1
    return { result: changed, changed }
  })
  return {
    rootNode,
    selectedNodeId: { value: 1, subscribe: (run: (value: unknown) => void) => { run(1); return () => {} } },
    revision,
    onLifecycle: vi.fn(() => vi.fn()),
    transaction,
    transformNode,
    RevisionConflictError,
  }
})

vi.mock('@system/infra/tauri/mcp', () => ({ default: tauriMcp }))
vi.mock('@system/ui/feedback/confirm/confirm-dialog-controller', () => ({ default: confirmDialogController }))
vi.mock('@system/workspace/tree/state', () => ({ default: treeStore }))
vi.mock('@system/workspace/element-definition/element-registry', () => ({
  default: { get: vi.fn(() => ({ canDisable: true })) },
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
    treeStore.rootNode.value = { id: 1, element: { kind: 'tag' }, children: [], isOpen: true }
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
})
