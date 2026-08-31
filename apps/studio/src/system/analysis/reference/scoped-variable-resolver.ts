import ContentHost from '../../element/content-host'
import type TreeNode from '../../tree/tree-node'

namespace ScopedVariableResolver {
  export type Declaration =
    | 'variable'
    | 'loop-index'
    | 'loop-item'
    | 'promise-result'
    | 'promise-error'

  export type Binding = {
    node: TreeNode.Node
    declaration: Declaration
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

  export const resolve = (
    rootNode: TreeNode.Node,
    sourceNodeId: number,
    id: string,
  ): Binding | null => {
    const path = findPath(rootNode, sourceNodeId) ?? []
    const visible = new Map<string, Binding>()
    const addVariable = (node: TreeNode.Node) => {
      if (node.element.kind !== 'variable') return
      visible.set(node.element.id, { node, declaration: 'variable' })
    }

    path.forEach((node, index) => {
      const nextNode = path[index + 1]
      if (
        node.element.kind === 'promise'
        && nextNode?.element.kind === 'promise-then'
        && node.element.resultType != null
      ) {
        visible.set(node.element.id, { node, declaration: 'promise-result' })
      }
      if (node.element.kind === 'promise-catch' && node.id !== sourceNodeId) {
        visible.set(node.element.id, { node, declaration: 'promise-error' })
      }
      if (node.element.kind === 'loop' && node.id !== sourceNodeId) {
        visible.set(node.element.indexId, { node, declaration: 'loop-index' })
        if (node.element.mode === 'collection') {
          visible.set(node.element.itemId, { node, declaration: 'loop-item' })
        }
      }

      const retentionNode = ContentHost.getRetentionNode(node)
      const elementsNode = ContentHost.getElementsNode(node)
      if (retentionNode != null && nextNode === elementsNode) {
        retentionNode.children.forEach(addVariable)
      }
      if (
        (
          node.element.kind === 'retention'
          || node.element.kind === 'function-procedure'
          || node.element.kind === 'promise-then'
          || node.element.kind === 'promise-catch'
        )
        && nextNode != null
      ) {
        node.children.slice(0, node.children.indexOf(nextNode)).forEach(addVariable)
      }
    })
    return visible.get(id) ?? null
  }
}

export default ScopedVariableResolver
