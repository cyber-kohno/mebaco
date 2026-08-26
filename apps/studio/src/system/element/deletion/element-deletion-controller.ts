import ReferenceGraph from '../../analysis/reference-graph'
import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import type TreeNode from '../../tree/tree-node'

namespace ElementDeletionController {
  export type Policy = {
    label: string
    structuralReferences: 'ignore' | 'block'
  }

  export type Request = {
    rootNode: TreeNode.Node
    node: TreeNode.Node
    policy: Policy
    deleteNode: () => void
  }

  const isDescendantOrSelf = (
    node: TreeNode.Node,
    ancestorNodeId: number,
    targetNodeId: number,
    insideAncestor = false,
  ): boolean => {
    const inside = insideAncestor || node.id === ancestorNodeId
    if (node.id === targetNodeId) return inside
    return node.children.some((child) => isDescendantOrSelf(
      child,
      ancestorNodeId,
      targetNodeId,
      inside,
    ))
  }

  const collectSurvivingStructuralReferences = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): readonly ReferenceGraph.Reference[] => ReferenceGraph.build(rootNode, targetNodeId)
    .references.filter((reference) => (
      reference.sourceType === 'structural'
      && !isDescendantOrSelf(rootNode, targetNodeId, reference.sourceNodeId)
    ))

  const formatReferenceLines = (
    references: readonly ReferenceGraph.Reference[],
  ): string[] => {
    const labelsByNode = new Map<number, Set<string>>()
    references.forEach((reference) => {
      const labels = labelsByNode.get(reference.sourceNodeId) ?? new Set<string>()
      labels.add(reference.sourceLabel)
      labelsByNode.set(reference.sourceNodeId, labels)
    })
    return [...labelsByNode]
      .sort(([left], [right]) => left - right)
      .map(([nodeId, labels]) => `node-${nodeId}: ${[...labels].join(', ')}`)
  }

  export const requestDelete = (
    request: Request,
  ): boolean => {
    if (request.policy.structuralReferences === 'block') {
      const references = collectSurvivingStructuralReferences(
        request.rootNode,
        request.node.id,
      )
      if (references.length > 0) {
        const nodeCount = new Set(references.map((reference) => reference.sourceNodeId)).size
        void ConfirmDialogController.openNotice({
          title: `Cannot Delete ${request.policy.label}`,
          message: [
            `${request.policy.label} is referenced by ${nodeCount} ${nodeCount === 1 ? 'element' : 'elements'}.`,
            ...formatReferenceLines(references),
            `Remove the ${nodeCount === 1 ? 'reference' : 'references'} before deleting this ${request.policy.label}.`,
          ],
        })
        return false
      }
    }

    request.deleteNode()
    return true
  }
}

export default ElementDeletionController
