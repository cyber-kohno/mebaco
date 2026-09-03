import type DevelopInteractionMode from '../../area/develop/interaction/develop-interaction-mode'
import FunctionSignatureExtraction from '../../element/kind/function/function-signature-extraction'
import TreeNode from '../tree-node'
import TreeTransferCatalog from '../transfer/tree-transfer-catalog'
import TreeTransferPlanner from '../transfer/tree-transfer-planner'
import TreeTransferValidator from '../transfer/tree-transfer-validator'

namespace TreeDestinationOperation {
  export type Presentation = {
    modeLabel: string
    dialogTitle: string
    destinationActionLabel: string
    confirmLabel: string
    failureMessage: string
    requiresName: boolean
  }

  export type Plan = {
    rootNode: TreeNode.Node
    selectedNodeId: number
    preserveVerificationNodeIds: readonly number[]
  }

  export const getPresentation = (
    session: DevelopInteractionMode.DestinationTransaction,
  ): Presentation => session.operation.type === 'copy'
    ? {
        modeLabel: 'Copy',
        dialogTitle: `Copy ${session.operation.sourceKind}`,
        destinationActionLabel: 'Paste here',
        confirmLabel: 'Copy',
        failureMessage: 'The element could not be copied.',
        requiresName: TreeTransferCatalog.isTransferableKind(session.operation.sourceKind)
          && TreeTransferCatalog.requiresName(session.operation.sourceKind),
      }
    : {
        modeLabel: 'Extract signature',
        dialogTitle: 'Extract signature',
        destinationActionLabel: 'Extract here',
        confirmLabel: 'Extract',
        failureMessage: 'The Signature could not be extracted.',
        requiresName: true,
      }

  export const isDestinationCandidate = (
    rootNode: TreeNode.Node,
    destinationNode: TreeNode.Node,
    session: DevelopInteractionMode.DestinationTransaction,
  ): boolean => {
    if (session.operation.type === 'copy') {
      const sourceNode = TreeNode.findNode(rootNode, session.sourceNodeId)
      return sourceNode != null
        && TreeTransferCatalog.canPasteTo(rootNode, sourceNode, destinationNode, 'copy')
    }
    return FunctionSignatureExtraction.canPlaceAt(
      rootNode,
      session.sourceNodeId,
      destinationNode,
    )
  }

  export const validateName = (
    rootNode: TreeNode.Node,
    destinationNode: TreeNode.Node,
    session: DevelopInteractionMode.DestinationTransaction,
    name: string,
  ): string | null => {
    if (session.operation.type === 'copy') {
      return TreeTransferCatalog.isTransferableKind(session.operation.sourceKind)
        ? TreeTransferCatalog.validateName(
            rootNode,
            destinationNode,
            session.operation.sourceKind,
            name,
          )
        : 'The copy source is no longer available.'
    }
    return FunctionSignatureExtraction.validateName(rootNode, destinationNode, name)
  }

  export const createSuggestedName = (
    session: DevelopInteractionMode.DestinationTransaction,
    index: number,
  ): string => {
    if (session.operation.type === 'copy') {
      if (
        TreeTransferCatalog.isTransferableKind(session.operation.sourceKind)
        && !TreeTransferCatalog.requiresName(session.operation.sourceKind)
      ) return ''
      return session.operation.sourceKind === 'style'
        ? `${session.sourceLabel}-copy${index === 1 ? '' : `-${index}`}`
        : `${session.sourceLabel}Copy${index === 1 ? '' : index}`
    }

    return ''
  }

  export const createPlan = async (
    previousRoot: TreeNode.Node,
    session: DevelopInteractionMode.DestinationTransaction,
    name: string,
  ): Promise<Plan> => {
    if (session.destinationNodeId == null) throw new Error('Select a destination.')

    if (session.operation.type === 'copy') {
      const plan = TreeTransferPlanner.copy(
        previousRoot,
        session.sourceNodeId,
        session.destinationNodeId,
        TreeTransferCatalog.isTransferableKind(session.operation.sourceKind)
          && TreeTransferCatalog.requiresName(session.operation.sourceKind)
          ? name
          : null,
      )
      const structureError = TreeTransferValidator.validateStructure(
        plan.rootNode,
        plan.copiedNodeId,
      )
      if (structureError != null) throw new Error(structureError)
      const referenceError = TreeTransferValidator.validateReferenceTargets(
        previousRoot,
        plan.rootNode,
        plan.nodeIds,
      )
      if (referenceError != null) throw new Error(referenceError)
      const expressionError = await TreeTransferValidator.validateExpressionScope(
        previousRoot,
        session.sourceNodeId,
        plan.rootNode,
        plan.copiedNodeId,
      )
      if (expressionError != null) throw new Error(expressionError)
      return {
        rootNode: plan.rootNode,
        selectedNodeId: plan.copiedNodeId,
        preserveVerificationNodeIds: [],
      }
    }

    const plan = FunctionSignatureExtraction.plan(
      previousRoot,
      session.sourceNodeId,
      session.destinationNodeId,
      name,
    )
    return {
      rootNode: plan.rootNode,
      selectedNodeId: plan.signatureNodeId,
      preserveVerificationNodeIds: [plan.functionNodeId],
    }
  }
}

export default TreeDestinationOperation
