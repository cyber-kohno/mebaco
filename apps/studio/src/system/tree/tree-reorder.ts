import type ElementDefinition from '../element/element-definition'
import type TreeNode from './tree-node'

namespace TreeReorder {
  export type Direction = -1 | 1

  type ParentResult = {
    parent: TreeNode.Node
    index: number
    node: TreeNode.Node
  }

  const findParent = (
    node: TreeNode.Node,
    targetNodeId: number,
  ): ParentResult | null => {
    const index = node.children.findIndex((child) => child.id === targetNodeId)
    if (index >= 0) return { parent: node, index, node: node.children[index] }

    for (const child of node.children) {
      const found = findParent(child, targetNodeId)
      if (found != null) return found
    }

    return null
  }

  export type ReorderGroupResolver = (
    node: TreeNode.Node,
  ) => ElementDefinition.ReorderGroup | null

  const getGroup = (
    node: TreeNode.Node,
    resolveGroup: ReorderGroupResolver,
  ): ElementDefinition.ReorderGroup | null => resolveGroup(node)

  const canSwap = (
    node: TreeNode.Node,
    neighbor: TreeNode.Node,
    resolveGroup: ReorderGroupResolver,
  ): boolean => {
    const group = getGroup(node, resolveGroup)
    if (group == null || getGroup(neighbor, resolveGroup) !== group) return false

    // If/ElseIf/Else and Case/Default branches have a structural order that
    // must remain valid even when reference consistency is not being checked.
    return group === 'siblings'
      || group === 'conditional-branch'
      || group === 'switch-case'
  }

  export const canMove = (
    rootNode: TreeNode.Node,
    nodeId: number,
    direction: Direction,
    resolveGroup: ReorderGroupResolver,
  ): boolean => {
    const result = findParent(rootNode, nodeId)
    if (result == null) return false
    const neighbor = result.parent.children[result.index + direction]
    return neighbor != null && canSwap(result.node, neighbor, resolveGroup)
  }

  export const move = (
    rootNode: TreeNode.Node,
    nodeId: number,
    direction: Direction,
    resolveGroup: ReorderGroupResolver,
  ): boolean => {
    const result = findParent(rootNode, nodeId)
    if (result == null) return false
    const neighborIndex = result.index + direction
    const neighbor = result.parent.children[neighborIndex]
    if (neighbor == null || !canSwap(result.node, neighbor, resolveGroup)) return false

    result.parent.children[result.index] = neighbor
    result.parent.children[neighborIndex] = result.node
    return true
  }
}

export default TreeReorder
