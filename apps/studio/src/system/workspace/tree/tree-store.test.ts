import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import { ProjectTreeFactory } from '@system/project/tree-factory'
import TreeStore from './tree-store'

describe('TreeStore transactions', () => {
  beforeEach(() => {
    TreeStore.replaceRoot(ProjectTreeFactory.createRootNode())
  })

  it('publishes one root update after an explicit transaction commits', () => {
    const rootNodeId = get(TreeStore.rootNode).id
    const roots: unknown[] = []
    const unsubscribe = TreeStore.rootNode.subscribe((root) => roots.push(root))

    const result = TreeStore.transaction(
      { source: 'mcp', label: 'Batch tree update' },
      () => {
        TreeStore.transformNode(rootNodeId, (node) => {
          node.isOpen = false
          return true
        })
        TreeStore.transformNode(rootNodeId, (node) => {
          node.disabled = true
          return true
        })
        expect(roots).toHaveLength(1)
        return 'done'
      },
    )

    expect(result).toEqual({ result: 'done', changed: true })
    expect(roots).toHaveLength(2)
    expect(get(TreeStore.revision)).toBe(1)
    expect(get(TreeStore.rootNode)).toMatchObject({ isOpen: false, disabled: true })
    unsubscribe()
  })

  it('rolls back tree, selection, notifications, and allocated IDs on failure', () => {
    const previousRoot = get(TreeStore.rootNode)
    const previousSelectedNodeId = get(TreeStore.selectedNodeId)
    const lifecycleListener = vi.fn()
    const transactionListener = vi.fn()
    const unsubscribeLifecycle = TreeStore.onLifecycle(lifecycleListener)
    const unsubscribeTransaction = TreeStore.onTransaction(transactionListener)

    expect(() => TreeStore.transaction(
      { source: 'mcp', label: 'Failing update' },
      () => {
        TreeStore.transformNode(previousRoot.id, (node) => {
          node.isOpen = false
          return true
        })
        throw new Error('failed')
      },
    )).toThrow('failed')

    expect(get(TreeStore.rootNode)).toBe(previousRoot)
    expect(get(TreeStore.selectedNodeId)).toBe(previousSelectedNodeId)
    expect(get(TreeStore.revision)).toBe(0)
    expect(lifecycleListener).not.toHaveBeenCalled()
    expect(transactionListener).not.toHaveBeenCalled()
    unsubscribeLifecycle()
    unsubscribeTransaction()
  })

  it('reports committed metadata and grouped lifecycle events', () => {
    const rootNodeId = get(TreeStore.rootNode).id
    const listener = vi.fn()
    const unsubscribe = TreeStore.onTransaction(listener)

    TreeStore.transaction(
      { source: 'mcp', label: 'Grouped update' },
      () => {
        TreeStore.transformNode(rootNodeId, (node) => {
          node.isOpen = false
          return true
        })
        TreeStore.transformNode(rootNodeId, (node) => {
          node.disabled = true
          return true
        })
      },
    )

    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0]).toMatchObject({
      options: { source: 'mcp', label: 'Grouped update' },
      previousSelectedNodeId: rootNodeId,
      selectedNodeId: rootNodeId,
      previousRevision: 0,
      revision: 1,
      lifecycleEvents: [{ type: 'change' }, { type: 'change' }],
    })
    unsubscribe()
  })

  it('wraps standalone mutations in an implicit user transaction', () => {
    const rootNodeId = get(TreeStore.rootNode).id
    const listener = vi.fn()
    const unsubscribe = TreeStore.onTransaction(listener)

    TreeStore.transformNode(rootNodeId, (node) => {
      node.isOpen = false
      return true
    })

    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0].options).toEqual({
      source: 'user',
      label: 'Transform tree node',
    })
    expect(get(TreeStore.revision)).toBe(1)
    unsubscribe()
  })

  it('rejects nested explicit transactions', () => {
    expect(() => TreeStore.transaction(
      { source: 'user', label: 'Outer' },
      () => TreeStore.transaction(
        { source: 'user', label: 'Inner' },
        () => undefined,
      ),
    )).toThrow('Nested tree transactions are not supported.')
  })

  it('rejects async transactions before publishing their draft', () => {
    const previousRoot = get(TreeStore.rootNode)

    expect(() => TreeStore.transaction(
      { source: 'mcp', label: 'Async update' },
      () => Promise.resolve(undefined),
    )).toThrow('Async tree transactions are not supported.')
    expect(get(TreeStore.rootNode)).toBe(previousRoot)
    expect(get(TreeStore.revision)).toBe(0)
  })

  it('does not increment revision for a no-op and resets it when the root is replaced', () => {
    const rootNodeId = get(TreeStore.rootNode).id

    expect(TreeStore.transformNode(-1, () => true)).toBe(false)
    expect(get(TreeStore.revision)).toBe(0)

    TreeStore.transformNode(rootNodeId, (node) => {
      node.disabled = true
      return true
    })
    expect(get(TreeStore.revision)).toBe(1)

    TreeStore.replaceRoot(ProjectTreeFactory.createRootNode())
    expect(get(TreeStore.revision)).toBe(0)
  })

  it('restores tree and selection as one undo transaction with a new revision', () => {
    const originalRoot = get(TreeStore.rootNode)
    const childNodeId = originalRoot.children[0]?.id ?? originalRoot.id

    TreeStore.transformNode(originalRoot.id, (node) => {
      node.disabled = true
      return true
    })
    expect(get(TreeStore.revision)).toBe(1)

    TreeStore.restoreHistorySnapshot(originalRoot, childNodeId, 'undo')

    expect(get(TreeStore.revision)).toBe(2)
    expect(get(TreeStore.rootNode).disabled).toBeUndefined()
    expect(get(TreeStore.selectedNodeId)).toBe(childNodeId)
  })

  it('applies a transaction when expectedRevision matches', () => {
    const rootNodeId = get(TreeStore.rootNode).id

    const result = TreeStore.transaction(
      { source: 'mcp', label: 'Expected update', expectedRevision: 0 },
      () => TreeStore.transformNode(rootNodeId, (node) => {
        node.disabled = true
        return true
      }),
    )

    expect(result.changed).toBe(true)
    expect(get(TreeStore.revision)).toBe(1)
    expect(get(TreeStore.rootNode).disabled).toBe(true)
  })

  it('rejects a stale expectedRevision before starting or changing history', () => {
    const rootNodeId = get(TreeStore.rootNode).id
    const startListener = vi.fn()
    const commitListener = vi.fn()
    const unsubscribeStart = TreeStore.onTransactionStart(startListener)
    const unsubscribeCommit = TreeStore.onTransaction(commitListener)

    TreeStore.transformNode(rootNodeId, (node) => {
      node.disabled = true
      return true
    })
    startListener.mockClear()
    commitListener.mockClear()
    const rootBeforeConflict = get(TreeStore.rootNode)

    expect(() => TreeStore.transaction(
      { source: 'mcp', label: 'Stale update', expectedRevision: 0 },
      () => TreeStore.transformNode(rootNodeId, (node) => {
        node.disabled = false
        return true
      }),
    )).toThrowError(TreeStore.RevisionConflictError)

    try {
      TreeStore.transaction(
        { source: 'mcp', label: 'Stale update', expectedRevision: 0 },
        () => undefined,
      )
    } catch (error) {
      expect(error).toMatchObject({
        code: 'REVISION_CONFLICT',
        expectedRevision: 0,
        actualRevision: 1,
      })
    }
    expect(get(TreeStore.rootNode)).toBe(rootBeforeConflict)
    expect(get(TreeStore.revision)).toBe(1)
    expect(startListener).not.toHaveBeenCalled()
    expect(commitListener).not.toHaveBeenCalled()
    unsubscribeStart()
    unsubscribeCommit()
  })
})
