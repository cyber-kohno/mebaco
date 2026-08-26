import { get, writable } from 'svelte/store'
import TreeStore from '../store/tree-store'
import TreeNode from './tree-node'

namespace TreeViewportController {
  export type State = {
    viewRootNodeId: number | null
  }

  export type RevealRequest = {
    nodeId: number
    sequence: number
  }

  export const state = writable<State>({ viewRootNodeId: null })
  export const revealRequest = writable<RevealRequest | null>(null)

  let revealSequence = 0

  const normalizeViewRootNodeId = (
    rootNode: TreeNode.Node,
    nodeId: number | null,
  ): number | null => (
    nodeId == null || nodeId === rootNode.id ? null : nodeId
  )

  export const resolveDisplayRoot = (
    rootNode: TreeNode.Node,
    viewportState: State,
  ): TreeNode.Node => (
    viewportState.viewRootNodeId == null
      ? rootNode
      : TreeNode.findNode(rootNode, viewportState.viewRootNodeId) ?? rootNode
  )

  export const setViewRootNodeId = (
    rootNode: TreeNode.Node,
    nodeId: number | null,
  ): boolean => {
    const normalizedNodeId = normalizeViewRootNodeId(rootNode, nodeId)
    if (
      normalizedNodeId != null
      && TreeNode.findNode(rootNode, normalizedNodeId) == null
    ) return false

    const current = get(state).viewRootNodeId
    if (current === normalizedNodeId) return false

    state.set({ viewRootNodeId: normalizedNodeId })
    return true
  }

  export const requestReveal = (nodeId: number) => {
    revealSequence += 1
    revealRequest.set({ nodeId, sequence: revealSequence })
  }

  export const setSelectedAsCriteria = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
  ): boolean => {
    if (TreeNode.findNode(rootNode, selectedNodeId) == null) return false
    const changed = setViewRootNodeId(rootNode, selectedNodeId)
    if (changed) requestReveal(selectedNodeId)
    return changed
  }

  export const raiseCriteria = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
  ): boolean => {
    const currentNodeId = get(state).viewRootNodeId
    if (currentNodeId == null) return false

    const parentNode = TreeNode.findParent(rootNode, currentNodeId)
    if (parentNode == null) return false

    const changed = setViewRootNodeId(rootNode, parentNode.id)
    if (changed) requestReveal(selectedNodeId)
    return changed
  }

  export const lowerCriteria = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
  ): boolean => {
    const currentNodeId = get(state).viewRootNodeId ?? rootNode.id
    const path = TreeNode.findPath(rootNode, selectedNodeId)
    if (path == null) return false

    const currentIndex = path.findIndex((node) => node.id === currentNodeId)
    if (currentIndex < 0 || currentIndex >= path.length - 1) return false

    const changed = setViewRootNodeId(rootNode, path[currentIndex + 1].id)
    if (changed) requestReveal(selectedNodeId)
    return changed
  }

  TreeStore.onLifecycle((event) => {
    if (event.type === 'replace') {
      state.set({ viewRootNodeId: null })
      revealRequest.set(null)
      return
    }

    const rootNode = get(TreeStore.rootNode)
    const currentNodeId = get(state).viewRootNodeId
    const selectedNodeId = get(TreeStore.selectedNodeId)

    if (
      currentNodeId != null
      && TreeNode.findNode(rootNode, currentNodeId) == null
    ) {
      setViewRootNodeId(
        rootNode,
        event.type === 'remove' ? event.parentNodeId : null,
      )
    }

    const repairedNodeId = get(state).viewRootNodeId
    if (
      repairedNodeId != null
      && !TreeNode.isDescendantOrSelf(rootNode, repairedNodeId, selectedNodeId)
    ) {
      setViewRootNodeId(rootNode, null)
    }
  })
}

export default TreeViewportController
