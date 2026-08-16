import type MebacoElement from './element'
import type TreeNode from '../tree/tree-node'

namespace ContentHost {
  type NodeFactory = (seed: TreeNode.Seed) => TreeNode.Node

  type StructuredContent = {
    retentionNode: TreeNode.Node
    elementsNode: TreeNode.Node
  }

  const findStructuredContent = (
    node: TreeNode.Node,
  ): StructuredContent | null => {
    const retentionNodes = node.children.filter((child) => (
      child.element.kind === 'retention'
    ))
    const elementsNodes = node.children.filter((child) => (
      child.element.kind === 'elements'
    ))

    if (retentionNodes.length !== 1 || elementsNodes.length !== 1) return null

    return {
      retentionNode: retentionNodes[0],
      elementsNode: elementsNodes[0],
    }
  }

  export const usesRetention = (node: TreeNode.Node): boolean => (
    findStructuredContent(node) != null
  )

  export const canUseRetention = (node: TreeNode.Node): boolean => (
    !node.children.some((child) => (
      child.element.kind === 'retention' || child.element.kind === 'elements'
    ))
  )

  export const canRemoveRetention = (node: TreeNode.Node): boolean => {
    const structured = findStructuredContent(node)
    return structured != null
      && node.children.length === 2
      && structured.retentionNode.children.length === 0
  }

  export const useRetention = (
    node: TreeNode.Node,
    createNode: NodeFactory,
  ): boolean => {
    if (!canUseRetention(node)) return false

    const retentionElement: MebacoElement.Element = { kind: 'retention' }
    const elementsElement: MebacoElement.Element = { kind: 'elements' }
    const retentionNode = createNode({ element: retentionElement })
    const elementsNode = createNode({ element: elementsElement })

    elementsNode.children = node.children
    node.children = [retentionNode, elementsNode]
    node.isOpen = true
    return true
  }

  export const removeRetention = (node: TreeNode.Node): boolean => {
    if (!canRemoveRetention(node)) return false

    const structured = findStructuredContent(node)
    if (structured == null) return false

    node.children = structured.elementsNode.children
    node.isOpen = true
    return true
  }

  export const getContentChildren = (
    node: TreeNode.Node,
  ): readonly TreeNode.Node[] => (
    findStructuredContent(node)?.elementsNode.children ?? node.children
  )

  export const getRetentionNode = (
    node: TreeNode.Node,
  ): TreeNode.Node | null => findStructuredContent(node)?.retentionNode ?? null

  export const getElementsNode = (
    node: TreeNode.Node,
  ): TreeNode.Node | null => findStructuredContent(node)?.elementsNode ?? null
}

export default ContentHost
