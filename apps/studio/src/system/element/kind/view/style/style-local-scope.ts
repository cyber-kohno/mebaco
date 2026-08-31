import type TreeNode from '../../../../tree/tree-node'
import type VariableElement from '../../variable/variable-element'

namespace StyleLocalScope {
  export type Entry = {
    node: TreeNode.Node & { element: VariableElement.Element }
    element: VariableElement.Element
  }

  const findPath = (
    node: TreeNode.Node,
    nodeId: number,
    path: TreeNode.Node[] = [],
  ): TreeNode.Node[] | null => {
    const nextPath = [...path, node]
    if (node.id === nodeId) return nextPath
    for (const child of node.children) {
      const found = findPath(child, nodeId, nextPath)
      if (found != null) return found
    }
    return null
  }

  export const findOwnerStyle = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): TreeNode.Node | null => {
    const path = findPath(rootNode, targetNodeId) ?? []
    return [...path].reverse().find((node) => node.element.kind === 'style') ?? null
  }

  export const getLocalsNode = (
    styleNode: TreeNode.Node | null,
  ): TreeNode.Node | null => styleNode?.children.find((child) => (
    child.element.kind === 'style-locals'
  )) ?? null

  const toEntry = (node: TreeNode.Node): Entry | null => (
    node.element.kind === 'variable'
      ? {
          node: node as TreeNode.Node & { element: VariableElement.Element },
          element: node.element,
        }
      : null
  )

  export const collectVisible = (
    rootNode: TreeNode.Node,
    sourceNodeId: number,
    includeTarget = false,
  ): readonly Entry[] => {
    const path = findPath(rootNode, sourceNodeId) ?? []
    const styleNode = [...path].reverse().find((node) => node.element.kind === 'style')
    const localsNode = getLocalsNode(styleNode ?? null)
    if (styleNode == null || localsNode == null) return []

    const sourceNode = path.at(-1)
    if (sourceNode?.element.kind === 'variable') {
      const targetIndex = localsNode.children.findIndex((child) => child.id === sourceNodeId)
      if (targetIndex < 0) return []
      return localsNode.children
        .slice(0, targetIndex + (includeTarget ? 1 : 0))
        .map(toEntry)
        .filter((entry): entry is Entry => entry != null)
    }

    return localsNode.children
      .map(toEntry)
      .filter((entry): entry is Entry => entry != null)
  }

  export const resolve = (
    rootNode: TreeNode.Node,
    sourceNodeId: number,
    id: string,
  ): Entry | null => [...collectVisible(rootNode, sourceNodeId)]
    .reverse()
    .find((entry) => entry.element.id === id) ?? null

  export const isLocalVariable = (
    rootNode: TreeNode.Node,
    nodeId: number,
  ): boolean => {
    const path = findPath(rootNode, nodeId) ?? []
    return path.at(-2)?.element.kind === 'style-locals'
  }
}

export default StyleLocalScope
