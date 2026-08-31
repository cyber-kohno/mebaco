import ScopedVariableResolver from '../../analysis/reference/scoped-variable-resolver'
import type TreeNode from '../../tree/tree-node'
import StateScope from '../../element/kind/variable/store/state-scope'
import ExpressionSourceCatalog from './expression-source-catalog'
import StyleLocalScope from '../../element/kind/view/style/style-local-scope'

namespace ExpressionVerificationScope {
  const findNode = (
    node: TreeNode.Node,
    nodeId: number,
  ): TreeNode.Node | null => {
    if (node.id === nodeId) return node
    for (const child of node.children) {
      const found = findNode(child, nodeId)
      if (found != null) return found
    }
    return null
  }

  const collectCandidates = (
    rootNode: TreeNode.Node,
  ): TreeNode.Node[] => {
    const result: TreeNode.Node[] = []
    const visit = (node: TreeNode.Node) => {
      if (ExpressionSourceCatalog.collect(rootNode, node).hasExpressionField) {
        result.push(node)
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return result
  }

  export const collectVisibleNodeIds = (
    rootNode: TreeNode.Node,
    definitionNodeId: number,
  ): readonly number[] => {
    const definitionNode = findNode(rootNode, definitionNodeId)
    if (definitionNode == null) return []

    if (definitionNode.element.kind === 'variable') {
      const definitionId = definitionNode.element.id
      const isStyleLocal = StyleLocalScope.isLocalVariable(rootNode, definitionNodeId)
      return collectCandidates(rootNode)
        .filter((candidate) => (
          candidate.id !== definitionNodeId
          && (isStyleLocal
            ? StyleLocalScope.resolve(rootNode, candidate.id, definitionId)?.node.id
            : ScopedVariableResolver.resolve(rootNode, candidate.id, definitionId)?.node.id
          ) === definitionNodeId
        ))
        .map((candidate) => candidate.id)
    }

    if (definitionNode.element.kind === 'state') {
      const definitionId = definitionNode.element.id
      return collectCandidates(rootNode)
        .filter((candidate) => (
          candidate.id !== definitionNodeId
          && StateScope.resolve(
            rootNode,
            candidate.id,
            definitionId,
          )?.node.id === definitionNodeId
        ))
        .map((candidate) => candidate.id)
    }

    return []
  }

  export const collectSubtreeVerificationNodeIds = (
    rootNode: TreeNode.Node,
    subtreeNodeId: number,
  ): readonly number[] => {
    const subtreeNode = findNode(rootNode, subtreeNodeId)
    if (subtreeNode == null) return []

    const result: number[] = []
    const visit = (node: TreeNode.Node) => {
      if (ExpressionSourceCatalog.collect(rootNode, node).hasExpressionField) {
        result.push(node.id)
      }
      node.children.forEach(visit)
    }
    visit(subtreeNode)
    return result
  }

  export const collectFunctionVerificationNodeIds = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
  ): readonly number[] => {
    const functionNode = findNode(rootNode, functionNodeId)
    if (functionNode?.element.kind !== 'function') return []

    const result: number[] = []
    const visit = (node: TreeNode.Node, owner: boolean) => {
      if (!owner && node.element.kind === 'function') return
      if (ExpressionSourceCatalog.collect(rootNode, node).hasExpressionField) {
        result.push(node.id)
      }
      node.children.forEach((child) => visit(child, false))
    }
    visit(functionNode, true)
    return result
  }
}

export default ExpressionVerificationScope
