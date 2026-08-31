import ExpressionReferenceRenamer from '../analysis/reference/expression-reference-renamer'
import type MebacoElement from '../element/element'
import TreeStore from '../store/tree-store'
import type TreeNode from '../tree/tree-node'
import ExpressionVerificationStore from '../validation/expression/expression-verification-store'
import LoopReferenceRefactor from '../analysis/reference/loop-reference-refactor'
import ExpressionVerificationImpact from '../validation/expression/expression-verification-impact'
import UnionDefinitionUpdatePolicy from '../element/kind/type/union/union-definition-update-policy'
import SignatureParameterRefactor from '../analysis/reference/signature-parameter-refactor'
import ObjectDefinitionUpdatePolicy from '../element/kind/type/object/object-definition-update-policy'
import ObjectPropertyReferenceRefactor from '../analysis/reference/object-property-reference-refactor'
import FunctionDefinitionUpdatePolicy from '../element/kind/function/function-definition-update-policy'

namespace ElementUpdateTransaction {
  export type Result = {
    idChanged: boolean
    updatedReferenceNodeIds: readonly number[]
    updatedOccurrenceCount: number
    verificationReset: boolean
    verificationImpact: ExpressionVerificationImpact.Value
    notices: readonly string[]
  }

  type IdElement = MebacoElement.Element & { id: string }

  const hasId = (element: MebacoElement.Element): element is IdElement => (
    typeof (element as { id?: unknown }).id === 'string'
  )

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
          ? ['Signature parameter order changed. Positional argument meaning may have changed; review call sites after Verify.']
          : []),
        ...(functionAnalysis?.notices ?? []),
        ...(objectAnalysis?.notices ?? []),
      ],
    }
  }
}

export default ElementUpdateTransaction
