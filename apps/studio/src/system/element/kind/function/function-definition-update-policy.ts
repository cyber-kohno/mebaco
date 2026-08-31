import ReferenceImpact from '../../../analysis/reference/reference-impact'
import TreeNode from '../../../tree/tree-node'
import ExpressionVerificationImpact from '../../../validation/expression/expression-verification-impact'
import ExpressionVerificationScope from '../../../validation/expression/expression-verification-scope'
import SignatureDefinition from '../type/signature/signature-definition'
import type FunctionElement from './function-element'
import FunctionDefinition from './function-definition'
import ReferenceGraph from '../../../analysis/reference/reference-graph'

namespace FunctionDefinitionUpdatePolicy {
  export type Analysis = {
    contractChanged: boolean
    parameterOrderChanged: boolean
    referTargetChanged: boolean
    externalReferenceNodeIds: readonly number[]
    verificationImpact: ExpressionVerificationImpact.Value
    notices: readonly string[]
  }

  const stringify = (value: unknown): string => JSON.stringify(value)

  const unique = (nodeIds: readonly number[]): number[] => [...new Set(nodeIds)]

  const getFunctionReferences = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
    functionId: string,
  ) => ReferenceGraph.build(rootNode, functionNodeId).references.filter((reference) => (
    reference.sourceType === 'expression'
    && reference.targetLabel === `function.${functionId}`
  ))

  const getParameterReferenceNodeIds = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
    parameterIds: ReadonlySet<string>,
  ): number[] => {
    const subtreeNodeIds = ExpressionVerificationScope.collectFunctionVerificationNodeIds(
      rootNode,
      functionNodeId,
    )
    return unique(
      ReferenceGraph.collectDependencies(rootNode, subtreeNodeIds)
        .filter((dependency) => (
          dependency.targetNodeId === functionNodeId
          && dependency.targetLabel.startsWith('function-parameter.')
          && parameterIds.has(dependency.targetLabel.slice('function-parameter.'.length))
        ))
        .map((dependency) => dependency.sourceNodeId),
    )
  }

  const getReturnVerificationNodeIds = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
  ): number[] => {
    const functionNode = TreeNode.findNode(rootNode, functionNodeId)
    if (functionNode == null) return []
    if (
      functionNode.element.kind === 'function'
      && functionNode.element.implementation.mode === 'code'
    ) return [functionNodeId]

    const result: number[] = []
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'function-return') result.push(node.id)
      node.children.forEach((child) => {
        if (child.element.kind !== 'function') visit(child)
      })
    }
    visit(functionNode)
    return result
  }

  const getContractFingerprint = (
    element: FunctionElement.Element,
  ): string => stringify(element.signature.mode === 'refer'
    ? element.signature
    : {
        mode: 'inline',
        definition: {
          async: element.signature.definition.async,
          parameters: element.signature.definition.parameters.map((parameter) => ({
            parameterId: parameter.parameterId,
            valueType: parameter.valueType,
            nullable: parameter.nullable,
          })),
          returnType: element.signature.definition.returnType,
        },
      })

  export const analyze = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
    previousElement: FunctionElement.Element,
    currentElement: FunctionElement.Element,
  ): Analysis => {
    const previousSignature = FunctionDefinition.resolveSignature(rootNode, previousElement)
    const currentSignature = FunctionDefinition.resolveSignature(rootNode, currentElement)
    const signatureIdentityChanged = (
      previousElement.signature.mode !== currentElement.signature.mode
      || (
        previousElement.signature.mode === 'refer'
        && currentElement.signature.mode === 'refer'
        && previousElement.signature.signatureTypeId !== currentElement.signature.signatureTypeId
      )
    )
    const signatureDiff = previousSignature == null || currentSignature == null
      ? null
      : SignatureDefinition.diffParameters(
          previousSignature.parameters,
          currentSignature.parameters,
        )
    const contractChanged = (
      getContractFingerprint(previousElement) !== getContractFingerprint(currentElement)
    )
    const parameterOrderChanged = (
      previousElement.signature.mode === 'inline'
      && currentElement.signature.mode === 'inline'
      && SignatureDefinition.diffParameters(
        previousElement.signature.definition.parameters,
        currentElement.signature.definition.parameters,
      ).reordered.length > 0
    )
    const referTargetChanged = (
      previousElement.signature.mode === 'refer'
      && currentElement.signature.mode === 'refer'
      && previousElement.signature.signatureTypeId !== currentElement.signature.signatureTypeId
    )
    const functionReferences = contractChanged
      ? getFunctionReferences(rootNode, functionNodeId, previousElement.id)
      : []
    const externalReferenceNodeIds = contractChanged
      ? unique(functionReferences
          .filter((reference) => !ReferenceImpact.isDescendantOrSelf(
            rootNode,
            functionNodeId,
            reference.sourceNodeId,
          ))
          .map((reference) => reference.sourceNodeId))
      : []
    const callReferenceNodeIds = unique(functionReferences.map((reference) => (
      reference.sourceNodeId
    )))
    const previousByParameterId = new Map(previousSignature?.parameters.map((parameter) => (
      [parameter.parameterId, parameter]
    )) ?? [])
    const changedOrRemovedParameterIds = new Set<string>([
      ...(signatureDiff?.removed.map(({ member }) => member.id) ?? []),
      ...(signatureDiff?.updated.flatMap(({ memberId, current }) => {
        const previous = previousByParameterId.get(memberId)
        return previous != null && (
          stringify(previous.valueType) !== stringify(current.valueType)
          || previous.nullable !== current.nullable
        ) ? [previous.id] : []
      }) ?? []),
    ])
    const asyncChanged = previousSignature?.async !== currentSignature?.async
    const returnTypeChanged = stringify(previousSignature?.returnType)
      !== stringify(currentSignature?.returnType)
    const subtreeNodeIds = signatureIdentityChanged || asyncChanged
      ? ExpressionVerificationScope.collectFunctionVerificationNodeIds(rootNode, functionNodeId)
      : []
    const parameterReferenceNodeIds = signatureIdentityChanged
      ? []
      : getParameterReferenceNodeIds(
          rootNode,
          functionNodeId,
          changedOrRemovedParameterIds,
        )
    const returnNodeIds = !signatureIdentityChanged && returnTypeChanged
      ? getReturnVerificationNodeIds(rootNode, functionNodeId)
      : []
    const verificationImpact = !contractChanged
      ? ExpressionVerificationImpact.none()
      : ExpressionVerificationImpact.nodes([
          ...callReferenceNodeIds,
          ...subtreeNodeIds,
          ...parameterReferenceNodeIds,
          ...returnNodeIds,
        ])

    return {
      contractChanged,
      parameterOrderChanged,
      referTargetChanged,
      externalReferenceNodeIds,
      verificationImpact,
      notices: !contractChanged
        ? []
        : [
            referTargetChanged
              ? 'Referenced Signature changed. Function implementation and call arguments were not modified; run Verify.'
              : 'Function Signature changed. Function implementation and call arguments were not modified; run Verify.',
            ...(parameterOrderChanged
              ? ['Function parameter order changed. Positional argument meaning may have changed; review call sites after Verify.']
              : []),
      ],
    }
  }

  export const analyzeReferencedSignatureUpdate = (
    rootNode: TreeNode.Node,
    signatureTypeId: string,
    previousDefinition: SignatureDefinition.Definition,
    currentDefinition: SignatureDefinition.Definition,
  ): ExpressionVerificationImpact.Value => {
    const impacts: ExpressionVerificationImpact.Value[] = []
    const renamedParameter = SignatureDefinition.diffParameters(
      previousDefinition.parameters,
      currentDefinition.parameters,
    ).updated.some(({ previous, current }) => previous.id !== current.id)
    const visit = (node: TreeNode.Node) => {
      if (
        node.element.kind === 'function'
        && node.element.signature.mode === 'refer'
        && node.element.signature.signatureTypeId === signatureTypeId
      ) {
        impacts.push(analyze(
          rootNode,
          node.id,
          {
            ...node.element,
            signature: { mode: 'inline', definition: previousDefinition },
          },
          {
            ...node.element,
            signature: { mode: 'inline', definition: currentDefinition },
          },
        ).verificationImpact)
        if (renamedParameter && node.element.implementation.mode === 'code') {
          impacts.push(ExpressionVerificationImpact.nodes([node.id]))
        }
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return ExpressionVerificationImpact.merge(...impacts)
  }
}

export default FunctionDefinitionUpdatePolicy
