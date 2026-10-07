import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import { ProjectTreeFactory } from '@system/project/tree-factory'
import TreeNode from '@system/model/tree/tree-node'
import McpEditSessionState from '@system/mcp/mcp-edit-session-state'
import TreeNavigationController from './tree-navigation-controller'
import TreeStore from './tree-store'

vi.mock('@system/ui/feedback/toast/toast-controller', () => ({ default: { show: vi.fn() } }))

describe('TreeStore checkout edit lock', () => {
  beforeEach(() => {
    McpEditSessionState.reset()
    TreeStore.replaceRoot(ProjectTreeFactory.createRootNode())
    TreeNavigationController.clear()
  })
  afterEach(() => McpEditSessionState.reset())

  it('rejects all user content mutations before callbacks, revision, selection or history change', () => {
    const root = get(TreeStore.rootNode)
    const selected = get(TreeStore.selectedNodeId)
    const start = vi.fn()
    const commit = vi.fn()
    const lifecycle = vi.fn()
    const callback = vi.fn()
    const off = [TreeStore.onTransactionStart(start), TreeStore.onTransaction(commit), TreeStore.onLifecycle(lifecycle)]
    McpEditSessionState.checkout('session', 0)
    const operations = [
      () => TreeStore.addChild(root.id, { kind: 'text', source: { type: 'literal', value: 'locked' } }),
      () => TreeStore.updateElement(root.id, root.element),
      () => TreeStore.removeNode(root.id),
      () => TreeStore.toggleDisabled(root.id),
      () => TreeStore.moveNode(root.id, -1),
      () => TreeStore.transformNode(root.id, callback),
      () => TreeStore.commitRootChange(root),
      () => TreeStore.replaceRoot(root),
      () => TreeStore.restoreHistorySnapshot(root, selected, 'undo'),
      () => TreeStore.restoreHistorySnapshot(root, selected, 'redo'),
      () => TreeStore.restoreHistorySnapshot(root, selected, 'restore'),
      () => TreeStore.transaction({ source: 'system', label: 'system edit' }, callback),
    ]
    try {
      operations.forEach((operation) => expect(operation).toThrowError(McpEditSessionState.Error))
      expect(get(TreeStore.rootNode)).toBe(root)
      expect(get(TreeStore.selectedNodeId)).toBe(selected)
      expect(get(TreeStore.revision)).toBe(0)
      ;[callback, start, commit, lifecycle].forEach((listener) => expect(listener).not.toHaveBeenCalled())
    } finally { off.forEach((unsubscribe) => unsubscribe()) }
  })

  it('allows only the owner to commit and publishes each MCP transaction immediately', () => {
    const checkout = McpEditSessionState.checkout('session', 0)
    const root = get(TreeStore.rootNode)
    const callback = vi.fn()
    expect(() => TreeStore.transaction({ source: 'mcp', label: 'missing' }, callback)).toThrow('non-empty')
    expect(() => TreeStore.transaction({ source: 'mcp', label: 'foreign', checkoutId: 'foreign' }, callback)).toThrow('does not belong')
    expect(callback).not.toHaveBeenCalled()
    const roots: TreeNode.Node[] = []
    const off = TreeStore.rootNode.subscribe((value) => roots.push(value))
    try {
      for (const disabled of [true, false]) {
        TreeStore.transaction({ source: 'mcp', label: 'live update', checkoutId: checkout.checkoutId, expectedRevision: get(TreeStore.revision) }, () => {
          TreeStore.transformNode(root.id, (node) => { node.disabled = disabled; return true })
          expect(TreeStore.getCurrentRoot().disabled).toBe(disabled)
        })
        expect(get(TreeStore.rootNode).disabled).toBe(disabled)
      }
      expect(roots).toHaveLength(3)
      expect(get(TreeStore.revision)).toBe(2)
      expect(() => TreeStore.transaction({ source: 'mcp', label: 'stale', checkoutId: checkout.checkoutId, expectedRevision: 0 }, callback)).toThrowError(TreeStore.RevisionConflictError)
      expect(get(TreeStore.revision)).toBe(2)
      McpEditSessionState.checkin('session', checkout.checkoutId, 2)
      TreeStore.transformNode(root.id, (node) => { node.disabled = true; return true })
      expect(get(TreeStore.revision)).toBe(3)
      expect(() => TreeStore.transaction({ source: 'mcp', label: 'expired', checkoutId: checkout.checkoutId }, callback)).toThrow('Check out')
    } finally { off() }
  })

  it('allows navigation, selection, tree expansion and local draft edits without a revision change', () => {
    const root = get(TreeStore.rootNode)
    const child = root.children[0]!
    const draft = structuredClone(child.element)
    McpEditSessionState.checkout('session', 0)
    const expanded = TreeNode.clone(root)
    expanded.isOpen = false
    TreeStore.rootNode.set(expanded)
    expect(TreeNavigationController.jumpToNode(child.id)).toBe(true)
    TreeStore.selectedNodeId.set(root.id)
    Object.assign(draft, { comment: 'local draft only' })
    expect(get(TreeStore.revision)).toBe(0)
    expect(get(TreeStore.selectedNodeId)).toBe(root.id)
    expect(get(TreeStore.rootNode).children[0]!.element).toEqual(child.element)
  })
})
