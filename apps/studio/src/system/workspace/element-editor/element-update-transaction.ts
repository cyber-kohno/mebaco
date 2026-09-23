import { ExpressionReferenceRenamer } from '@system/model/reference/expression-renamer'
import type MebacoElement from '@system/model/element/element'
import TreeStore from '@system/workspace/tree/state'
import type TreeNode from '@system/model/tree/tree-node'
import { ExpressionVerificationStore } from '@system/workspace/validation/state'
import { LoopReferenceRefactor } from '@system/model/reference/loop-refactor'
import { ExpressionVerificationImpact } from '@system/model/validation/expression/impact'
import UnionDefinitionUpdatePolicy from '@system/model/type-system/union/union-definition-update-policy'
import { SignatureParameterRefactor } from '@system/model/reference/signature-refactor'
import ObjectDefinitionUpdatePolicy from '@system/model/type-system/object/object-definition-update-policy'
import { ObjectPropertyReferenceRefactor } from '@system/model/reference/object-property-refactor'
import FunctionDefinitionUpdatePolicy from '@system/model/function/function-definition-update-policy'

namespace ElementUpdateTransaction {
  export type Notice =
    | { type: 'signature-parameter-order-changed' }
    | { type: 'function-signature-changed'; referenced: boolean }
    | {
        type: 'object-members-changed'
        addedCount: number
        removedCount: number
        updatedCount: number
        renamedCount: number
      }
    | {
        type: 'object-members-renamed'
        objectName: string
        renames: readonly Readonly<{
          previousPath: string
          currentPath: string
        }>[]
      }
    | { type: 'object-base-selection-changed'; effectiveShapeChanged: false }
    | {
        type: 'object-base-selection-changed'
        effectiveShapeChanged: true
        addedCount: number
        removedCount: number
        updatedCount: number
      }

  export type Result = {
    idChanged: boolean
    updatedReferenceNodeIds: readonly number[]
    updatedOccurrenceCount: number
    verificationReset: boolean
    verificationImpact: ExpressionVerificationImpact.Value
    notices: readonly Notice[]
  }

  type IdElement = MebacoElement.Element & { id: string }

  const hasId = (element: MebacoElement.Element): element is IdElement => (
    typeof (element as { id?: unknown }).id === 'string'
  )

  const createObjectNotices = (
    objectName: string,
    analysis: ObjectDefinitionUpdatePolicy.Analysis,
  ): Notice[] => {
    const notices: Notice[] = []
    const directCount = analysis.added.length
      + analysis.removed.length
      + analysis.updated.length
      + analysis.renamed.length
    if (directCount > 0) {
      notices.push({
        type: 'object-members-changed',
        addedCount: analysis.added.length,
        removedCount: analysis.removed.length,
        updatedCount: analysis.updated.length,
        renamedCount: analysis.renamed.length,
      })
    }
    const renames = analysis.renamed.flatMap((change) => (
      change.previousPath == null || change.currentPath == null
        ? []
        : [{
            previousPath: change.previousPath,
            currentPath: change.currentPath,
          }]
    ))
    if (renames.length > 0) {
      notices.push({
        type: 'object-members-renamed',
        objectName,
        renames,
      })
    }
    if (analysis.baseSelectionChanged) {
      notices.push(analysis.effectiveShapeChanged
        ? {
            type: 'object-base-selection-changed',
            effectiveShapeChanged: true,
            addedCount: analysis.effectiveAddedPaths.length,
            removedCount: analysis.effectiveRemovedPaths.length,
            updatedCount: analysis.effectiveUpdatedPaths.length,
          }
        : {
            type: 'object-base-selection-changed',
            effectiveShapeChanged: false,
          })
    }
    return notices
  }

  export const commit = (
    rootNode: TreeNode.Node,
    nodeId: number,
    previousElement: MebacoElement.Element,
    nextElement: MebacoElement.Element,
  ): Result => {
    const functionAnalysis = previousElement.kind === 'function'
      && nextElement.kind === 'function'
      ? FunctionDefinitionUpdatePolicy.analyze(
          rootNode,
          nodeId,
          previousElement,
          nextElement,
        )
      : null
    if (previousElement.kind === 'union-type' && nextElement.kind === 'union-type') {
      UnionDefinitionUpdatePolicy.assertCompatible(
        rootNode,
        nodeId,
        previousElement,
        nextElement,
      )
    }
    const objectAnalysis = previousElement.kind === 'object-type'
      && nextElement.kind === 'object-type'
      ? ObjectDefinitionUpdatePolicy.analyze(rootNode, previousElement, nextElement)
      : null
    const loopResult = previousElement.kind === 'loop' && nextElement.kind === 'loop'
      ? LoopReferenceRefactor.plan(rootNode, nodeId, previousElement, nextElement)
      : {
          rootNode,
          changedNodeIds: [] as readonly number[],
          updatedOccurrenceCount: 0,
          verificationReset: false,
        }
    const signatureResult = previousElement.kind === 'signature-type'
      && nextElement.kind === 'signature-type'
      ? SignatureParameterRefactor.apply(
          loopResult.rootNode,
          nodeId,
          previousElement,
          nextElement,
        )
      : {
          rootNode: loopResult.rootNode,
          changedNodeIds: [] as readonly number[],
          updatedOccurrenceCount: 0,
          orderChanged: false,
        }
    const functionSignatureResult = previousElement.kind === 'function'
      && nextElement.kind === 'function'
      ? SignatureParameterRefactor.applyFunction(
          signatureResult.rootNode,
          nodeId,
          previousElement,
          nextElement,
        )
      : {
          rootNode: signatureResult.rootNode,
          element: nextElement,
          changedNodeIds: [] as readonly number[],
          updatedOccurrenceCount: 0,
          orderChanged: false,
        }
    const effectiveNextElement = functionSignatureResult.element
    const objectPropertyResult = objectAnalysis == null
      ? {
          rootNode: functionSignatureResult.rootNode,
          changedNodeIds: [] as readonly number[],
          updatedOccurrenceCount: 0,
        }
      : ObjectPropertyReferenceRefactor.apply(functionSignatureResult.rootNode, objectAnalysis)
    const idChanged = hasId(previousElement)
      && hasId(effectiveNextElement)
      && previousElement.id !== effectiveNextElement.id
    const renameResult = idChanged
      ? ExpressionReferenceRenamer.rename(
          objectPropertyResult.rootNode,
          nodeId,
          effectiveNextElement.id,
          previousElement.kind === 'function' && effectiveNextElement.kind === 'function'
            ? effectiveNextElement
            : undefined,
        )
      : {
          rootNode: objectPropertyResult.rootNode,
          targetElement: effectiveNextElement,
          changedNodeIds: [] as readonly number[],
          occurrenceCount: 0,
        }
    const finalNextElement = previousElement.kind === 'function'
      && effectiveNextElement.kind === 'function'
      && idChanged
      ? renameResult.targetElement
      : effectiveNextElement
    const impactPreviousElement = previousElement.kind === 'function'
      && finalNextElement.kind === 'function'
      && previousElement.implementation.mode === 'code'
      && finalNextElement.implementation.mode === 'code'
      && functionSignatureResult.updatedOccurrenceCount > 0
      ? {
          ...previousElement,
          implementation: finalNextElement.implementation,
        }
      : previousElement
    const updateResult = TreeStore.createUpdatedRootWithReport(
      renameResult.rootNode,
      nodeId,
      finalNextElement,
      impactPreviousElement,
    )
    const verificationImpact = ExpressionVerificationImpact.merge(
      updateResult.report.verificationImpact,
      functionAnalysis?.verificationImpact ?? ExpressionVerificationImpact.none(),
      previousElement.kind === 'function' && finalNextElement.kind === 'function'
        ? ExpressionVerificationImpact.nodes([
            ...renameResult.changedNodeIds,
          ])
        : ExpressionVerificationImpact.none(),
      loopResult.verificationReset
        ? ExpressionVerificationImpact.all()
        : ExpressionVerificationImpact.none(),
    )
    const verificationReset = ExpressionVerificationImpact.hasImpact(verificationImpact)

    TreeStore.commitRootChange(updateResult.rootNode)
    ExpressionVerificationStore.invalidate(verificationImpact)

    return {
      idChanged,
      updatedReferenceNodeIds: [...new Set([
        ...loopResult.changedNodeIds,
        ...signatureResult.changedNodeIds,
        ...functionSignatureResult.changedNodeIds,
        ...objectPropertyResult.changedNodeIds,
        ...renameResult.changedNodeIds,
      ])],
      updatedOccurrenceCount: (
        loopResult.updatedOccurrenceCount
        + signatureResult.updatedOccurrenceCount
        + functionSignatureResult.updatedOccurrenceCount
        + objectPropertyResult.updatedOccurrenceCount
        + renameResult.occurrenceCount
      ),
      verificationReset,
      verificationImpact,
      notices: [
        ...(signatureResult.orderChanged
          ? [{ type: 'signature-parameter-order-changed' as const }]
          : []),
        ...(functionAnalysis?.contractChanged
          ? [{
              type: 'function-signature-changed' as const,
              referenced: functionAnalysis.referTargetChanged,
            }]
          : []),
        ...(objectAnalysis == null
          || previousElement.kind !== 'object-type'
          || nextElement.kind !== 'object-type'
          ? []
          : createObjectNotices(nextElement.id, objectAnalysis)),
      ],
    }
  }
}

export default ElementUpdateTransaction
