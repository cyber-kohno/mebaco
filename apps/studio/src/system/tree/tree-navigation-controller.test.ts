import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import TreeStore from '../store/tree-store'
import TreeNode from './tree-node'
import TreeNavigationController from './tree-navigation-controller'
import TreeViewportController from './tree-viewport-controller'

const createTree = (): TreeNode.Node => ({
  id: 1,
  element: { kind: 'project' },
  isOpen: true,
  children: [
    {
      id: 2,
      element: { kind: 'apps' },
      isOpen: true,
      children: [
        {
          id: 3,
          element: { kind: 'app' } as never,
          isOpen: false,
          children: [
            { id: 4, element: { kind: 'entry' } as never, isOpen: true, children: [] },
          ],
        },
      ],
    },
    {
      id: 5,
      element: { kind: 'launchers' },
      isOpen: true,
      children: [
        { id: 6, element: { kind: 'launcher' } as never, isOpen: true, children: [] },
      ],
    },
  ],
})

beforeEach(() => {
  TreeStore.replaceRoot(createTree())
})

describe('TreeNode navigation helpers', () => {
  it('finds paths, parents, and descendant relationships', () => {
    const rootNode = createTree()

    expect(TreeNode.findPath(rootNode, 4)?.map((node) => node.id)).toEqual([1, 2, 3, 4])
    expect(TreeNode.findPath(rootNode, 99)).toBeNull()
    expect(TreeNode.findParent(rootNode, 3)?.id).toBe(2)
    expect(TreeNode.isDescendantOrSelf(rootNode, 2, 2)).toBe(true)
    expect(TreeNode.isDescendantOrSelf(rootNode, 2, 4)).toBe(true)
    expect(TreeNode.isDescendantOrSelf(rootNode, 5, 4)).toBe(false)
  })

  it('opens only the ancestors between the display root and target', () => {
    const rootNode = createTree()
    TreeNode.findNode(rootNode, 2)!.isOpen = false
    TreeNode.findNode(rootNode, 3)!.isOpen = false
    TreeNode.findNode(rootNode, 5)!.isOpen = false

    expect(TreeNode.openPath(rootNode, 2, 4)).toBe(true)
    expect(TreeNode.findNode(rootNode, 2)?.isOpen).toBe(true)
    expect(TreeNode.findNode(rootNode, 3)?.isOpen).toBe(true)
    expect(TreeNode.findNode(rootNode, 5)?.isOpen).toBe(false)
    expect(TreeNode.openPath(rootNode, 2, 4)).toBe(false)
  })
})

describe('TreeViewportController', () => {
  it('sets, raises, and lowers Criteria without changing selection', () => {
    TreeStore.selectedNodeId.set(4)
    const rootNode = get(TreeStore.rootNode)

    expect(TreeViewportController.setSelectedAsCriteria(rootNode, 4)).toBe(true)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(4)
    expect(TreeViewportController.raiseCriteria(rootNode, 4)).toBe(true)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(3)
    expect(TreeViewportController.raiseCriteria(rootNode, 4)).toBe(true)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(2)
    expect(TreeViewportController.lowerCriteria(rootNode, 4)).toBe(true)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(3)
    expect(get(TreeStore.selectedNodeId)).toBe(4)
  })

  it('repairs Criteria when its node is removed', () => {
    TreeStore.selectedNodeId.set(3)
    TreeViewportController.setSelectedAsCriteria(get(TreeStore.rootNode), 3)

    TreeStore.removeNode(3)

    expect(get(TreeStore.selectedNodeId)).toBe(2)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(2)
  })
})

describe('TreeNavigationController', () => {
  it('keeps whole-project Criteria and restores jump history', () => {
    TreeStore.selectedNodeId.set(4)

    expect(TreeNavigationController.jumpToNode(6)).toBe(true)
    expect(get(TreeStore.selectedNodeId)).toBe(6)
    expect(get(TreeViewportController.state).viewRootNodeId).toBeNull()

    expect(TreeNavigationController.goBack()).toBe(true)
    expect(get(TreeStore.selectedNodeId)).toBe(4)
    expect(get(TreeViewportController.state).viewRootNodeId).toBeNull()
  })

  it('keeps Criteria for an internal jump and switches it for an external jump', () => {
    TreeStore.selectedNodeId.set(3)
    TreeViewportController.setSelectedAsCriteria(get(TreeStore.rootNode), 2)

    TreeNavigationController.jumpToNode(4)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(2)

    TreeNavigationController.jumpToNode(6)
    expect(get(TreeViewportController.state).viewRootNodeId).toBe(6)
    expect(get(TreeStore.selectedNodeId)).toBe(6)
  })

  it('moves backward and forward through explicit jumps only', () => {
    TreeStore.selectedNodeId.set(2)

    TreeNavigationController.jumpToNode(4)
    TreeNavigationController.jumpToNode(6)
    expect(TreeNavigationController.getHistorySizes()).toEqual({ back: 2, forward: 0 })

    expect(TreeNavigationController.goBack()).toBe(true)
    expect(get(TreeStore.selectedNodeId)).toBe(4)
    expect(TreeNavigationController.goBack()).toBe(true)
    expect(get(TreeStore.selectedNodeId)).toBe(2)
    expect(TreeNavigationController.goForward()).toBe(true)
    expect(get(TreeStore.selectedNodeId)).toBe(4)
  })

  it('does not add history for an invalid or identical jump', () => {
    TreeStore.selectedNodeId.set(4)

    expect(TreeNavigationController.jumpToNode(99)).toBe(false)
    expect(TreeNavigationController.jumpToNode(4)).toBe(false)
    expect(TreeNavigationController.getHistorySizes()).toEqual({ back: 0, forward: 0 })
  })

  it('clears history and Criteria when the project root is replaced', () => {
    TreeStore.selectedNodeId.set(4)
    TreeNavigationController.jumpToNode(6)
    expect(TreeNavigationController.getHistorySizes().back).toBe(1)

    TreeStore.replaceRoot(createTree())

    expect(TreeNavigationController.getHistorySizes()).toEqual({ back: 0, forward: 0 })
    expect(get(TreeViewportController.state).viewRootNodeId).toBeNull()
  })
})
