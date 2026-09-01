import ComponentPropBindingSync from '../kind/component/shared/component-prop-binding-sync'
import LaunchArgumentBindingSync from '../kind/app/launch/launch-argument-binding-sync'
import StyleInheritanceBindingSync from '../kind/view/style/style-inheritance-binding-sync'
import StyleParameterBindingSync from '../kind/view/style/style-parameter-binding-sync'
import type MebacoElement from '../element'
import TreeNode from '../../tree/tree-node'
import TypeImpact from '../../validation/expression/type-impact'
import ElementMutationReport from './element-mutation-report'
import ReferenceImpact from '../../analysis/reference/reference-impact'
import ExpressionVerificationImpact from '../../validation/expression/expression-verification-impact'
import ExpressionVerificationScope from '../../validation/expression/expression-verification-scope'
import ObjectDefinitionUpdatePolicy from '../kind/type/object/object-definition-update-policy'
import FunctionDefinitionUpdatePolicy from '../kind/function/function-definition-update-policy'
import StyleLocalScope from '../kind/view/style/style-local-scope'
import DebugResourceBindingSync from '../kind/debug/debug-resource-binding-sync'

namespace ElementMutationCoordinator {
  export const afterAdd = (
    rootNode: TreeNode.Node,
    addedNode: TreeNode.Node,
  ): ElementMutationReport.Value => {
    const { element } = addedNode
    let correctedNodeCount = 0
    if (element.kind === 'value-prop') {
      correctedNodeCount = ComponentPropBindingSync.add(rootNode, addedNode.id, element)
    } else if (element.kind === 'launch-argument') {
      correctedNodeCount = LaunchArgumentBindingSync.add(rootNode, addedNode.id, element)
    } else if (element.kind === 'style-param') {
      correctedNodeCount = StyleParameterBindingSync.add(rootNode, addedNode.id, element)
    } else if (
      element.kind === 'directory-resource'
      || element.kind === 'text-resource'
      || element.kind === 'sqlite-resource'
      || element.kind === 'debug-configuration'
    ) {
      correctedNodeCount = DebugResourceBindingSync.sync(rootNode)
    }
    const localVariableReferences = element.kind === 'variable'
      && StyleLocalScope.isLocalVariable(rootNode, addedNode.id)
      ? ReferenceImpact.collectReferences(rootNode, [addedNode.id], 'expression')
      : []
    return {
      correctedNodeCount,
      verificationImpact: localVariableReferences.length > 0
        ? ExpressionVerificationImpact.nodes(
            localVariableReferences.map((reference) => reference.sourceNodeId),
          )
        : element.kind === 'style-param' || element.kind === 'launch-argument'
        ? ExpressionVerificationImpact.all()
        : ExpressionVerificationImpact.none(),
    }
  }

  export const afterUpdate = (
    previousRoot: TreeNode.Node,
    nextRoot: TreeNode.Node,
    nodeId: number,
    previousElement: MebacoElement.Element,
    nextElement: MebacoElement.Element,
    impactPreviousElement: MebacoElement.Element = previousElement,
  ): ElementMutationReport.Value => {
    let correctedNodeCount = 0
    let contractChanged = false
    let objectTypeImpactChanged: boolean | null = null
    if (previousElement.kind === 'value-prop' && nextElement.kind === 'value-prop') {
      correctedNodeCount = ComponentPropBindingSync.update(
        nextRoot,
        nodeId,
        previousElement,
        nextElement,
      )
    } else if (
      previousElement.kind === 'launch-argument'
      && nextElement.kind === 'launch-argument'
    ) {
      correctedNodeCount = LaunchArgumentBindingSync.update(
        nextRoot,
        nodeId,
        previousElement,
        nextElement,
      )
    } else if (previousElement.kind === 'style-param' && nextElement.kind === 'style-param') {
      correctedNodeCount = StyleParameterBindingSync.update(
        nextRoot,
        nodeId,
        previousElement,
        nextElement,
      )
    } else if (previousElement.kind === 'style' && nextElement.kind === 'style') {
      const result = StyleInheritanceBindingSync.update(previousRoot, nextRoot, nodeId)
      correctedNodeCount = result.updatedNodeIds.length
      contractChanged = result.contractChangedStyleIds.length > 0
    } else if (
      previousElement.kind === 'object-type'
      && nextElement.kind === 'object-type'
    ) {
      objectTypeImpactChanged = ObjectDefinitionUpdatePolicy.analyze(
        previousRoot,
        previousElement,
        nextElement,
      ).effectiveShapeChanged
    }
    const functionAnalysis = previousElement.kind === 'function'
      && nextElement.kind === 'function'
      ? FunctionDefinitionUpdatePolicy.analyze(
          previousRoot,
          nodeId,
          previousElement,
          nextElement,
        )
      : null
    const signatureUpdate = previousElement.kind === 'signature-type'
      && nextElement.kind === 'signature-type'
      ? { previous: previousElement, current: nextElement }
      : null
    const signatureContractChanged = signatureUpdate != null
      && TypeImpact.hasChanged(signatureUpdate.previous, signatureUpdate.current)
    const signatureFunctionImpact = signatureUpdate == null
      ? ExpressionVerificationImpact.none()
      : FunctionDefinitionUpdatePolicy.analyzeReferencedSignatureUpdate(
          previousRoot,
          signatureUpdate.previous.typeId,
          signatureUpdate.previous,
          signatureUpdate.current,
        )
    const signatureExpressionReferenceNodeIds = !signatureContractChanged
      ? []
      : ReferenceImpact.collectReferences(previousRoot, [nodeId], 'expression')
          .map((reference) => reference.sourceNodeId)
    const signatureHasNonFunctionStructuralReferences = signatureUpdate != null
      && signatureContractChanged
      && ReferenceImpact.collectReferences(previousRoot, [nodeId], 'structural')
        .some((reference) => {
          const source = TreeNode.findNode(previousRoot, reference.sourceNodeId)?.element
          return source?.kind !== 'function'
            || source.signature.mode !== 'refer'
            || source.signature.signatureTypeId !== signatureUpdate.previous.typeId
        })
    const referencedSignatureImpact = signatureUpdate == null
      ? null
      : signatureHasNonFunctionStructuralReferences
        ? ExpressionVerificationImpact.all()
        : ExpressionVerificationImpact.merge(
            signatureFunctionImpact,
            ExpressionVerificationImpact.nodes(signatureExpressionReferenceNodeIds),
          )
    const typeImpactChanged = functionAnalysis == null
      && referencedSignatureImpact == null
      && (objectTypeImpactChanged
      ?? TypeImpact.hasChanged(impactPreviousElement, nextElement)
      )
    const referenceSensitiveTypeImpact = (
      impactPreviousElement.kind === 'state'
      && nextElement.kind === 'state'
    ) || (
      impactPreviousElement.kind === 'variable'
      && nextElement.kind === 'variable'
    )
    const scopedNodeIds = referenceSensitiveTypeImpact && typeImpactChanged
      ? ExpressionVerificationScope.collectVisibleNodeIds(nextRoot, nodeId)
      : []
    const scopedNodeIdSet = new Set(scopedNodeIds)
    const hasReferences = ReferenceImpact.collectReferences(
      nextRoot,
      [nodeId],
      'expression',
    ).some((reference) => scopedNodeIdSet.has(reference.sourceNodeId))
    const verificationImpact = functionAnalysis != null
      ? functionAnalysis.verificationImpact
      : referencedSignatureImpact != null
      ? referencedSignatureImpact
      : referenceSensitiveTypeImpact
      ? hasReferences
        ? ExpressionVerificationImpact.nodes(scopedNodeIds)
        : ExpressionVerificationImpact.none()
      : typeImpactChanged
        ? ExpressionVerificationImpact.all()
        : ExpressionVerificationImpact.none()
    const codeFunctionChanged = (
      impactPreviousElement.kind === 'function'
      && nextElement.kind === 'function'
      && nextElement.implementation.mode === 'code'
      && JSON.stringify(impactPreviousElement) !== JSON.stringify(nextElement)
    )

    return {
      correctedNodeCount,
      verificationImpact: ExpressionVerificationImpact.merge(
        contractChanged
          ? ExpressionVerificationImpact.all()
          : verificationImpact,
        codeFunctionChanged
          ? ExpressionVerificationImpact.nodes([nodeId])
          : ExpressionVerificationImpact.none(),
      ),
    }
  }

  export const beforeRemove = (
    rootNode: TreeNode.Node,
    removedNode: TreeNode.Node,
  ): ElementMutationReport.Value => {
    let correctedNodeCount = 0
    const removedResourceIds = new Set<string>()
    const collectRemovedResourceIds = (node: TreeNode.Node) => {
      if (
        node.element.kind === 'directory-resource'
        || node.element.kind === 'text-resource'
        || node.element.kind === 'sqlite-resource'
      ) {
        removedResourceIds.add(node.element.resourceId)
      }
      node.children.forEach(collectRemovedResourceIds)
    }
    collectRemovedResourceIds(removedNode)
    if (removedResourceIds.size > 0) {
      correctedNodeCount += DebugResourceBindingSync.remove(
        rootNode,
        removedResourceIds,
      )
    }
    if (removedNode.element.kind === 'value-prop') {
      correctedNodeCount += ComponentPropBindingSync.remove(
        rootNode,
        removedNode.id,
        removedNode.element.propId,
      )
    }
    if (removedNode.element.kind === 'launch-argument') {
      correctedNodeCount += LaunchArgumentBindingSync.remove(
        rootNode,
        removedNode.id,
        removedNode.element.propId,
      )
    }

    const styleParameterIds: string[] = []
    const collectContracts = (node: TreeNode.Node) => {
      if (node.element.kind === 'style-param') styleParameterIds.push(node.element.parameterId)
      node.children.forEach(collectContracts)
    }
    collectContracts(removedNode)
    if (styleParameterIds.length > 0) {
      correctedNodeCount += StyleParameterBindingSync.remove(rootNode, styleParameterIds)
    }

    const targetNodeIds = ReferenceImpact.collectSubtreeNodeIds(removedNode)
    const scopedDefinition = removedNode.element.kind === 'state'
      || removedNode.element.kind === 'variable'
    const scopedNodeIds = scopedDefinition
      ? ExpressionVerificationScope.collectVisibleNodeIds(rootNode, removedNode.id)
      : []
    const scopedNodeIdSet = new Set(scopedNodeIds)
    const survivingReferences = removedNode.element.kind === 'loop'
      ? []
      : ReferenceImpact.collectSurvivingReferences(
          rootNode,
          removedNode.id,
          targetNodeIds,
          'expression',
        )
    const hasSurvivingReferences = scopedDefinition
      ? survivingReferences.some((reference) => (
          scopedNodeIdSet.has(reference.sourceNodeId)
        ))
      : survivingReferences.length > 0
    return {
      correctedNodeCount,
      verificationImpact: !hasSurvivingReferences
        ? ExpressionVerificationImpact.none()
        : removedNode.element.kind === 'style-locals'
          ? ExpressionVerificationImpact.nodes(
              survivingReferences.map((reference) => reference.sourceNodeId),
            )
        : scopedDefinition
          ? ExpressionVerificationImpact.nodes(scopedNodeIds)
          : ExpressionVerificationImpact.all(),
    }
  }
}

export default ElementMutationCoordinator
