import { get } from 'svelte/store'
import TreeStore from '../store/tree-store'
import TreeNode from './tree-node'
import TreeViewportController from './tree-viewport-controller'

namespace TreeNavigationController {
  export type Location = {
    selectedNodeId: number
    viewRootNodeId: number | null
  }

  const HISTORY_LIMIT = 100
  const backStack: Location[] = []
  const forwardStack: Location[] = []

  const getCurrentLocation = (): Location => ({
    selectedNodeId: get(TreeStore.selectedNodeId),
    viewRootNodeId: get(TreeViewportController.state).viewRootNodeId,
  })

  const isSameLocation = (left: Location, right: Location): boolean => (
    left.selectedNodeId === right.selectedNodeId
    && left.viewRootNodeId === right.viewRootNodeId
  )

  const push = (stack: Location[], location: Location) => {
    stack.push(location)
    if (stack.length > HISTORY_LIMIT) stack.shift()
  }

  const applyLocation = (location: Location): boolean => {
    const rootNode = get(TreeStore.rootNode)
    if (TreeNode.findNode(rootNode, location.selectedNodeId) == null) return false

    let viewRootNodeId = location.viewRootNodeId
    if (
      viewRootNodeId != null
      && (
        TreeNode.findNode(rootNode, viewRootNodeId) == null
        || !TreeNode.isDescendantOrSelf(rootNode, viewRootNodeId, location.selectedNodeId)
      )
    ) viewRootNodeId = null

    const nextRoot = TreeNode.clone(rootNode)
    const displayRootNodeId = viewRootNodeId ?? nextRoot.id
    if (TreeNode.openPath(nextRoot, displayRootNodeId, location.selectedNodeId)) {
      TreeStore.rootNode.set(nextRoot)
    }

    TreeViewportController.setViewRootNodeId(nextRoot, viewRootNodeId)
    TreeStore.selectedNodeId.set(location.selectedNodeId)
    TreeViewportController.requestReveal(location.selectedNodeId)
    return true
  }

  export const jumpToNode = (nodeId: number): boolean => {
    const rootNode = get(TreeStore.rootNode)
    if (TreeNode.findNode(rootNode, nodeId) == null) return false

    const current = getCurrentLocation()
    const currentViewRootNodeId = current.viewRootNodeId
    const nextViewRootNodeId = currentViewRootNodeId == null
      ? null
      : TreeNode.isDescendantOrSelf(rootNode, currentViewRootNodeId, nodeId)
        ? currentViewRootNodeId
        : nodeId === rootNode.id ? null : nodeId
    const next = { selectedNodeId: nodeId, viewRootNodeId: nextViewRootNodeId }

    if (isSameLocation(current, next)) {
      TreeViewportController.requestReveal(nodeId)
      return false
    }

    push(backStack, current)
    forwardStack.length = 0
    return applyLocation(next)
  }

  export const goBack = (): boolean => {
    while (backStack.length > 0) {
      const location = backStack.pop()
      if (location == null) break

      const current = getCurrentLocation()
      if (!applyLocation(location)) continue

      push(forwardStack, current)
      return true
    }
    return false
  }

  export const goForward = (): boolean => {
    while (forwardStack.length > 0) {
      const location = forwardStack.pop()
      if (location == null) break

      const current = getCurrentLocation()
      if (!applyLocation(location)) continue

      push(backStack, current)
      return true
    }
    return false
  }

  export const clear = () => {
    backStack.length = 0
    forwardStack.length = 0
  }

  export const getHistorySizes = () => ({
    back: backStack.length,
    forward: forwardStack.length,
  })

  TreeStore.onLifecycle((event) => {
    if (event.type === 'replace') clear()
  })
}

export default TreeNavigationController
