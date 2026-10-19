import { ReferenceGraph } from '@system/model/reference/graph'
import { ReferenceImpact } from '@system/model/reference/impact'
import { ConfirmDialogController } from '@system/ui/feedback/confirm'
import type TreeNode from '@system/model/tree/tree-node'
import { ExpressionVerificationStore } from '@system/workspace/validation/state'
import { ExpressionVerificationImpact } from '@system/model/validation/expression/impact'
import { ExpressionVerificationScope } from '@system/model/validation/expression/scope'
import { translate } from '@system/application/localization'

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

  const formatBlockedReferenceSummary = (
    label: string,
    nodeCount: number,
  ): string => nodeCount === 1
    ? translate('workspace.elementDeletion.blocked.referenceSummary.one', {
        label,
      })
    : translate('workspace.elementDeletion.blocked.referenceSummary.many', {
        label,
        count: nodeCount,
      })

  const formatExpressionReferenceSummary = (
    label: string,
    referenceCount: number,
    nodeCount: number,
  ): string => {
    const parameters = { label, referenceCount, nodeCount }
    if (referenceCount === 1 && nodeCount === 1) {
      return translate(
        'workspace.elementDeletion.confirm.referenceSummary.oneOne',
        parameters,
      )
    }
    if (referenceCount === 1) {
      return translate(
        'workspace.elementDeletion.confirm.referenceSummary.oneMany',
        parameters,
      )
    }
    if (nodeCount === 1) {
      return translate(
        'workspace.elementDeletion.confirm.referenceSummary.manyOne',
        parameters,
      )
    }
    return translate(
      'workspace.elementDeletion.confirm.referenceSummary.manyMany',
      parameters,
    )
  }

  export const requestDelete = async (
    request: Request,
  ): Promise<boolean> => {
    const targetNodeIds = (request.referenceNodes ?? [request.node])
      .map((node) => node.id)
    const scopedDefinition = request.node.element.kind === 'state'
      || request.node.element.kind === 'variable'
      || request.node.element.kind === 'constant'
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
          title: translate('workspace.elementDeletion.blocked.title', {
            label: request.policy.label,
          }),
          message: [
            formatBlockedReferenceSummary(request.policy.label, nodeCount),
            ...formatReferenceLines(references),
            translate(
              nodeCount === 1
                ? 'workspace.elementDeletion.blocked.removeReference.one'
                : 'workspace.elementDeletion.blocked.removeReference.many',
              { label: request.policy.label },
            ),
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
          title: translate('workspace.elementDeletion.confirm.title', {
            label: request.policy.label,
          }),
          message: [
            formatExpressionReferenceSummary(
              request.policy.label,
              references.length,
              nodeCount,
            ),
            ...formatReferenceLines(references),
            translate('workspace.elementDeletion.confirm.warning'),
          ],
          choices: [
            { label: translate('common.action.cancel'), role: 'cancel' },
            {
              label: translate('common.action.deleteAnyway'),
              role: 'proceed',
            },
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
        const { ExpressionVerificationRunner } = await import(
          '@system/application/validation/expression'
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
