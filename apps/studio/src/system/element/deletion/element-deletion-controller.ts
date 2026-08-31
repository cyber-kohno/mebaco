import ReferenceGraph from '../../analysis/reference/reference-graph'
import ReferenceImpact from '../../analysis/reference/reference-impact'
import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import type TreeNode from '../../tree/tree-node'
import ExpressionVerificationStore from '../../validation/expression/expression-verification-store'
import ExpressionVerificationImpact from '../../validation/expression/expression-verification-impact'
import ExpressionVerificationScope from '../../validation/expression/expression-verification-scope'

namespace ElementDeletionController {
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
    expressionReferenceGuard?: (
      references: readonly ReferenceGraph.Reference[],
    ) => { title: string; message: string[] } | null
    getRootNodeAfterDelete?: () => TreeNode.Node
    deleteNode: () => void
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
    const scopedDefinition = request.node.element.kind === 'state'
      || request.node.element.kind === 'variable'
    const scopedNodeIds = scopedDefinition
      ? ExpressionVerificationScope.collectVisibleNodeIds(
          request.rootNode,
          request.node.id,
        )
      : []
    const scopedNodeIdSet = new Set(scopedNodeIds)
    let hasSurvivingExpressionReferences = false
    let survivingExpressionReferences: readonly ReferenceGraph.Reference[] = []
    if (request.policy.structuralReferences === 'block') {
      const references = ReferenceImpact.collectSurvivingReferences(
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
      const collectedReferences = ReferenceImpact.collectSurvivingReferences(
        request.rootNode,
        request.node.id,
        targetNodeIds,
        'expression',
      )
      const references = scopedDefinition
        ? collectedReferences.filter((reference) => (
            scopedNodeIdSet.has(reference.sourceNodeId)
          ))
        : collectedReferences
      if (references.length > 0) {
        const blocked = request.expressionReferenceGuard?.(references) ?? null
        if (blocked != null) {
          await ConfirmDialogController.openNotice(blocked)
          return false
        }
        hasSurvivingExpressionReferences = true
        survivingExpressionReferences = references
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

    const verificationImpact = hasSurvivingExpressionReferences
      && scopedDefinition
      ? ExpressionVerificationImpact.nodes(
          scopedNodeIds,
        )
      : hasSurvivingExpressionReferences
        ? ExpressionVerificationImpact.all()
        : ExpressionVerificationImpact.none()

    request.deleteNode()
    if (hasSurvivingExpressionReferences) {
      ExpressionVerificationStore.invalidate(verificationImpact)
      const nextRoot = request.getRootNodeAfterDelete?.()
      if (nextRoot != null) {
        const { default: ExpressionVerificationRunner } = await import(
          '../../validation/expression/expression-verification-runner'
        )
        const sourceNodeIds = new Set(
          survivingExpressionReferences.map((reference) => reference.sourceNodeId),
        )
        for (const sourceNodeId of sourceNodeIds) {
          const sourceNode = findNode(nextRoot, sourceNodeId)
          if (sourceNode == null) continue
          const result = await ExpressionVerificationRunner.verify(nextRoot, sourceNode)
          if (result != null) ExpressionVerificationStore.setResult(sourceNode, result)
        }
      }
    }
    return true
  }
}

export default ElementDeletionController
