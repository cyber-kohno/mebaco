import type TreeNode from '../../tree/tree-node'
import ReferenceGraph from './reference-graph'

namespace ReferenceImpact {
  export const isDescendantOrSelf = (
    rootNode: TreeNode.Node,
    ancestorNodeId: number,
    targetNodeId: number,
    insideAncestor = false,
  ): boolean => {
    const inside = insideAncestor || rootNode.id === ancestorNodeId
    if (rootNode.id === targetNodeId) return inside
    return rootNode.children.some((child) => isDescendantOrSelf(
      child,
      ancestorNodeId,
      targetNodeId,
      inside,
    ))
  }

  export const collectSubtreeNodeIds = (
    node: TreeNode.Node,
    result: number[] = [],
  ): readonly number[] => {
    result.push(node.id)
    node.children.forEach((child) => collectSubtreeNodeIds(child, result))
    return result
  }

  export const collectReferences = (
    rootNode: TreeNode.Node,
    targetNodeIds: readonly number[],
    sourceType: ReferenceGraph.ReferenceSourceType,
    excludedSourceSubtreeNodeId?: number,
  ): readonly ReferenceGraph.Reference[] => {
    const references = new Map<string, ReferenceGraph.Reference>()
    targetNodeIds.forEach((targetNodeId) => {
      ReferenceGraph.build(rootNode, targetNodeId).references
        .filter((reference) => (
          reference.sourceType === sourceType
          && (
            excludedSourceSubtreeNodeId == null
            || !isDescendantOrSelf(
              rootNode,
              excludedSourceSubtreeNodeId,
              reference.sourceNodeId,
            )
          )
        ))
        .forEach((reference) => references.set(
          `${reference.sourceNodeId}:${reference.sourceLabel}:${reference.targetNodeId}:${reference.sourceType}`,
          reference,
        ))
    })
    return [...references.values()]
  }

  export const collectSurvivingReferences = (
    rootNode: TreeNode.Node,
    deletedNodeId: number,
    targetNodeIds: readonly number[],
    sourceType: ReferenceGraph.ReferenceSourceType,
  ): readonly ReferenceGraph.Reference[] => collectReferences(
    rootNode,
    targetNodeIds,
    sourceType,
    deletedNodeId,
  )

  export const hasExpressionReferences = (
    rootNode: TreeNode.Node,
    targetNodeIds: readonly number[],
  ): boolean => collectReferences(rootNode, targetNodeIds, 'expression').length > 0

  export const hasSurvivingExpressionReferences = (
    rootNode: TreeNode.Node,
    deletedNodeId: number,
    targetNodeIds: readonly number[],
  ): boolean => collectSurvivingReferences(
    rootNode,
    deletedNodeId,
    targetNodeIds,
    'expression',
  ).length > 0
}

export default ReferenceImpact
