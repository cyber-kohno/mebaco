import type StateElement from './state-element'
import type TreeNode from '../../../../tree/tree-node'

namespace StateScope {
  const findPath = (
    node: TreeNode.Node,
    targetNodeId: number,
    path: TreeNode.Node[] = [],
  ): TreeNode.Node[] | null => {
    const nextPath = [...path, node]
    if (node.id === targetNodeId) return nextPath

    for (const child of node.children) {
      const found = findPath(child, targetNodeId, nextPath)
      if (found != null) return found
    }
    return null
  }

  const getStatesFromOwner = (
    ownerNode: TreeNode.Node,
  ): StateElement.Element[] => {
    const storeNode = ownerNode.children.find((child) => child.element.kind === 'store')
    const statesNode = storeNode?.children.find((child) => child.element.kind === 'states')
    return statesNode?.children
      .map((child) => child.element)
      .filter((element): element is StateElement.Element => element.kind === 'state')
      ?? []
  }

  export const getAncestorStateIds = (
    rootNode: TreeNode.Node,
    statesNodeId: number,
  ): string[] => {
    const path = findPath(rootNode, statesNodeId) ?? []
    return path
      .filter((node) => node.element.kind === 'app' || node.element.kind === 'component')
      .flatMap((node) => getStatesFromOwner(node).map((state) => state.id))
  }
}

export default StateScope
