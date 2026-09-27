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

vi.mock('svelte/store', () => ({ get: (store: { value: unknown }) => store.value }))
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

describe('EditHistoryController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.clear.mockResolvedValue(undefined)
    mocks.record.mockResolvedValue(undefined)
    mocks.rootNode.value = { id: 1, element: { kind: 'project' }, isOpen: true, children: [] }
    mocks.selectedNodeId.value = 1
    mocks.viewport.value = { viewRootNodeId: null }
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
      previousSelectedNodeId: 1,
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
})
