import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  clear: vi.fn(),
  restoreHistorySnapshot: vi.fn(),
  setViewRootNodeId: vi.fn(),
  requestReveal: vi.fn(),
  rootNode: { value: { id: 1, element: { kind: 'project' }, isOpen: true, children: [] } },
  selectedNodeId: { value: 1 },
  viewport: { value: { viewRootNodeId: null as number | null } },
  startListener: null as null | ((value: any) => void),
  transactionListener: null as null | ((value: any) => void),
  lifecycleListener: null as null | ((value: any) => void),
}))

vi.mock('svelte/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('svelte/store')>()
  return { ...actual, get: (store: any) => 'value' in store ? store.value : actual.get(store) }
})
vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: { show: vi.fn() } }))
vi.mock('@system/infra/tauri/edit-history', () => ({
  default: {
    record: mocks.record,
    undo: mocks.undo,
    redo: mocks.redo,
    clear: mocks.clear,
  },
}))
vi.mock('@system/workspace/tree/state', () => ({
  default: {
    rootNode: mocks.rootNode,
    selectedNodeId: mocks.selectedNodeId,
    restoreHistorySnapshot: mocks.restoreHistorySnapshot,
    onTransactionStart: vi.fn((listener) => { mocks.startListener = listener; return vi.fn() }),
    onTransaction: vi.fn((listener) => { mocks.transactionListener = listener; return vi.fn() }),
    onLifecycle: vi.fn((listener) => { mocks.lifecycleListener = listener; return vi.fn() }),
  },
}))
vi.mock('@system/workspace/tree/tree-viewport-controller', () => ({
  default: {
    state: mocks.viewport,
    setViewRootNodeId: mocks.setViewRootNodeId,
    requestReveal: mocks.requestReveal,
  },
}))

import EditHistoryController from './edit-history-controller'
import EditHistoryLog from './edit-history-log'
import McpEditSessionState from '@system/mcp/mcp-edit-session-state'

describe('EditHistoryController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    McpEditSessionState.reset()
    mocks.clear.mockResolvedValue(undefined)
    mocks.record.mockResolvedValue(undefined)
    mocks.rootNode.value = { id: 1, element: { kind: 'project' }, isOpen: true, children: [] }
    mocks.selectedNodeId.value = 1
    mocks.viewport.value = { viewRootNodeId: null }
  })

  it('does not pop Rust undo/redo history or restore entries while checked out', async () => {
    EditHistoryController.connect()
    McpEditSessionState.checkout('session', 0)
    await expect(EditHistoryController.undo()).resolves.toBe(false)
    await expect(EditHistoryController.redo()).resolves.toBe(false)
    await expect(EditHistoryController.restore(0)).resolves.toBe(false)
    expect(mocks.undo).not.toHaveBeenCalled()
    expect(mocks.redo).not.toHaveBeenCalled()
    expect(mocks.restoreHistorySnapshot).not.toHaveBeenCalled()
  })

  it('blocks checkout until an in-flight native undo has finished', async () => {
    EditHistoryController.connect()
    let resolveUndo!: (value: null) => void
    mocks.undo.mockImplementation(() => new Promise((resolve) => { resolveUndo = resolve }))
    const undo = EditHistoryController.undo()
    await vi.waitFor(() => expect(mocks.undo).toHaveBeenCalledOnce())
    expect(() => McpEditSessionState.checkout('session', 0)).toThrow('in progress')
    resolveUndo(null)
    await expect(undo).resolves.toBe(false)
    expect(() => McpEditSessionState.checkout('session', 0)).not.toThrow()
  })

  it('releases the history reservation when the native call fails', async () => {
    EditHistoryController.connect()
    mocks.redo.mockRejectedValue(new Error('native error'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(EditHistoryController.redo()).resolves.toBe(false)
    expect(() => McpEditSessionState.checkout('session', 0)).not.toThrow()
    log.mockRestore()
  })

  it('records the tree and operation state from before a committed transaction', async () => {
    EditHistoryController.connect()
    const previousRoot = { id: 1, element: { kind: 'project' }, isOpen: false, children: [] }
    mocks.viewport.value = { viewRootNodeId: 1 }
    mocks.startListener?.({
      options: { source: 'user', label: 'Update' },
      rootNode: previousRoot,
      selectedNodeId: 1,
      revision: 0,
    })
    mocks.transactionListener?.({
      options: { source: 'user', label: 'Update' },
      previousRootNode: previousRoot,
      rootNode: previousRoot,
      previousSelectedNodeId: 1,
      selectedNodeId: 1,
      previousRevision: 0,
      revision: 1,
      lifecycleEvents: [],
    })

    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledOnce())
    expect(JSON.parse(mocks.record.mock.calls[0][0])).toEqual({
      rootNode: previousRoot,
      selectedNodeId: 1,
      viewRootNodeId: 1,
    })
  })

  it('restores tree, selection, and viewport returned by undo', async () => {
    EditHistoryController.connect()
    const restoredRoot = { id: 1, element: { kind: 'project' }, isOpen: false, children: [] }
    mocks.undo.mockResolvedValue(JSON.stringify({
      rootNode: restoredRoot,
      selectedNodeId: 1,
      viewRootNodeId: 1,
    }))

    await expect(EditHistoryController.undo()).resolves.toBe(true)

    expect(mocks.restoreHistorySnapshot).toHaveBeenCalledWith(restoredRoot, 1, 'undo')
    expect(mocks.setViewRootNodeId).toHaveBeenCalledWith(mocks.rootNode.value, 1)
    expect(mocks.requestReveal).toHaveBeenCalledWith(1)
  })

  it('restores a selected history entry as a restore transaction', async () => {
    EditHistoryController.connect()
    const targetRoot = { id: 1, element: { kind: 'project' }, isOpen: false, children: [] } as any
    EditHistoryLog.record({
      options: { source: 'user', label: 'Original change' },
      previousRootNode: mocks.rootNode.value as any,
      rootNode: targetRoot,
      previousSelectedNodeId: 1,
      selectedNodeId: 1,
      previousRevision: 0,
      revision: 1,
      lifecycleEvents: [],
    })

    await expect(EditHistoryController.restore(1)).resolves.toBe(true)

    expect(mocks.restoreHistorySnapshot).toHaveBeenCalledWith(
      targetRoot,
      1,
      'restore',
      'Restore history #1',
    )
    expect(mocks.setViewRootNodeId).toHaveBeenCalledWith(mocks.rootNode.value, null)
    expect(mocks.requestReveal).toHaveBeenCalledWith(1)
  })
})
