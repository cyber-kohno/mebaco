import ReferenceGraph from '../../analysis/reference-graph'
import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import type TreeNode from '../../tree/tree-node'
import ExpressionVerificationStore from '../../validation/expression-verification-store'

namespace ElementDeletionController {
  export type Policy = {
    label: string
    structuralReferences: 'ignore' | 'block'
    expressionReferences?: 'ignore' | 'confirm'
  }

  export type Request = {
    rootNode: TreeNode.Node
    node: TreeNode.Node
    referenceNodes?: readonly TreeNode.Node[]
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

  const collectSurvivingReferences = (
    rootNode: TreeNode.Node,
    deletedNodeId: number,
    targetNodeIds: readonly number[],
    sourceType: ReferenceGraph.ReferenceSourceType,
  ): readonly ReferenceGraph.Reference[] => {
    const references = new Map<string, ReferenceGraph.Reference>()
    targetNodeIds.forEach((targetNodeId) => {
      ReferenceGraph.build(rootNode, targetNodeId).references
        .filter((reference) => (
          reference.sourceType === sourceType
          && !isDescendantOrSelf(rootNode, deletedNodeId, reference.sourceNodeId)
        ))
        .forEach((reference) => references.set(
          `${reference.sourceNodeId}:${reference.sourceLabel}:${reference.targetNodeId}:${reference.sourceType}`,
          reference,
        ))
    })
    return [...references.values()]
  }

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

  export const requestDelete = async (
    request: Request,
  ): Promise<boolean> => {
    const targetNodeIds = (request.referenceNodes ?? [request.node])
      .map((node) => node.id)
    if (request.policy.structuralReferences === 'block') {
      const references = collectSurvivingReferences(
        request.rootNode,
        request.node.id,
        targetNodeIds,
        'structural',
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

    if (request.policy.expressionReferences === 'confirm') {
      const references = collectSurvivingReferences(
        request.rootNode,
        request.node.id,
        targetNodeIds,
        'expression',
      )
      if (references.length > 0) {
        const nodeCount = new Set(references.map((reference) => reference.sourceNodeId)).size
        const confirmed = await ConfirmDialogController.open({
          tone: 'danger',
          title: `Delete ${request.policy.label}?`,
          message: [
            `${request.policy.label} is referenced by ${references.length} ${references.length === 1 ? 'expression' : 'expressions'} in ${nodeCount} ${nodeCount === 1 ? 'element' : 'elements'}.`,
            ...formatReferenceLines(references),
            'Deleting it will leave invalid expressions. You can repair them and run Verify afterward.',
          ],
          choices: [
            { label: 'Cancel', role: 'cancel' },
            { label: 'Delete Anyway', role: 'proceed' },
          ],
        })
        if (!confirmed) return false
      }
    }

    request.deleteNode()
    if (request.policy.expressionReferences === 'confirm') {
      ExpressionVerificationStore.clear()
    }
    return true
  }
}

export default ElementDeletionController
