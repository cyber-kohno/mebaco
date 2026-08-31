import type StateElement from './state-element'
import type TreeNode from '../../../../tree/tree-node'

namespace StateScope {
  export type Entry = {
    node: TreeNode.Node & { element: StateElement.Element }
    element: StateElement.Element
  }

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

  const getStateNodesFromOwner = (
    ownerNode: TreeNode.Node,
  ): Entry[] => {
    const storeNode = ownerNode.children.find((child) => child.element.kind === 'store')
    const statesNode = storeNode?.children.find((child) => child.element.kind === 'states')
    return statesNode?.children
      .filter((node): node is TreeNode.Node & { element: StateElement.Element } => (
        node.element.kind === 'state'
      ))
      .map((node) => ({ node, element: node.element }))
      ?? []
  }

  export const collectVisible = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): Entry[] => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const ownerAppNode = [...path].reverse().find((node) => node.element.kind === 'app')
    if (ownerAppNode == null) {
      const ownerCommonNode = [...path].reverse().find((node) => node.element.kind === 'common')
      if (ownerCommonNode != null) return getStateNodesFromOwner(ownerCommonNode)
      return rootNode.children
        .filter((node): node is TreeNode.Node & { element: StateElement.Element } => (
          node.element.kind === 'state'
        ))
        .map((node) => ({ node, element: node.element }))
    }

    const states = new Map<string, Entry>()
    getStateNodesFromOwner(ownerAppNode).forEach((entry) => (
      states.set(entry.element.id, entry)
    ))
    path
      .filter((node) => node.element.kind === 'component')
      .forEach((componentNode) => {
        getStateNodesFromOwner(componentNode).forEach((entry) => (
          states.set(entry.element.id, entry)
        ))
      })
    return [...states.values()]
  }

  export const resolve = (
    rootNode: TreeNode.Node,
    sourceNodeId: number,
    id: string,
  ): Entry | null => collectVisible(rootNode, sourceNodeId)
    .find((entry) => entry.element.id === id) ?? null

  export const getAncestorStateIds = (
    rootNode: TreeNode.Node,
    statesNodeId: number,
  ): string[] => {
    const path = findPath(rootNode, statesNodeId) ?? []
    return path
      .filter((node) => node.element.kind === 'app' || node.element.kind === 'component')
      .flatMap((node) => getStateNodesFromOwner(node).map((entry) => entry.element.id))
  }
}

export default StateScope
