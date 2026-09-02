import TreeNode from '../../../tree/tree-node'
import TreeTransferCatalog from '../../../tree/transfer/tree-transfer-catalog'
import SignatureDefinition from '../type/signature/signature-definition'
import TypeCatalog from '../type/type-catalog'

namespace FunctionSignatureExtraction {
  export type Plan = {
    rootNode: TreeNode.Node
    functionNodeId: number
    signatureNodeId: number
  }

  const findMaxNodeId = (node: TreeNode.Node): number => node.children.reduce(
    (maximum, child) => Math.max(maximum, findMaxNodeId(child)),
    node.id,
  )

  const createCandidate = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
    destinationNodeId: number,
    signatureName: string,
    signatureTypeId: string,
  ): Plan => {
    const sourceNode = TreeNode.findNode(rootNode, functionNodeId)
    const destinationNode = TreeNode.findNode(rootNode, destinationNodeId)
    if (sourceNode?.element.kind !== 'function') {
      throw new Error('The source Function is no longer available.')
    }
    if (sourceNode.element.signature.mode !== 'inline') {
      throw new Error('Only a Function with an Inline Signature can be extracted.')
    }
    if (destinationNode == null) {
      throw new Error('The selected destination is no longer available.')
    }
    if (!TreeTransferCatalog.canContainKind(rootNode, destinationNode, 'signature-type')) {
      throw new Error('The selected destination cannot contain a Signature Type.')
    }

    const nextRoot = TreeNode.clone(rootNode)
    const nextFunctionNode = TreeNode.findNode(nextRoot, functionNodeId)
    const nextDestinationNode = TreeNode.findNode(nextRoot, destinationNodeId)
    if (nextFunctionNode?.element.kind !== 'function' || nextDestinationNode == null) {
      throw new Error('The extraction target changed before it could be committed.')
    }

    const definition = structuredClone(sourceNode.element.signature.definition)
    const signatureNodeId = findMaxNodeId(rootNode) + 1
    const signatureNode: TreeNode.Node = {
      id: signatureNodeId,
      element: {
        kind: 'signature-type',
        typeId: signatureTypeId,
        id: signatureName,
        async: definition.async,
        parameters: definition.parameters,
        returnType: definition.returnType,
      },
      isOpen: true,
      children: [],
    }
    const insertIndex = TreeTransferCatalog.getInsertIndex(nextDestinationNode)
    if (insertIndex == null) nextDestinationNode.children.push(signatureNode)
    else nextDestinationNode.children.splice(insertIndex, 0, signatureNode)
    nextDestinationNode.isOpen = true

    nextFunctionNode.element = {
      ...nextFunctionNode.element,
      signature: { mode: 'refer', signatureTypeId },
    }

    return {
      rootNode: nextRoot,
      functionNodeId,
      signatureNodeId,
    }
  }

  const validateCandidate = (
    plan: Plan,
    expectedDefinition: SignatureDefinition.Definition,
  ): string | null => {
    const signatureNode = TreeNode.findNode(plan.rootNode, plan.signatureNodeId)
    if (signatureNode?.element.kind !== 'signature-type') {
      return 'The extracted Signature Type was not created.'
    }
    const structureError = SignatureDefinition.validate(
      {
        async: signatureNode.element.async,
        parameters: signatureNode.element.parameters,
        returnType: signatureNode.element.returnType,
      },
      TypeCatalog.getObjectOptions(plan.rootNode, plan.signatureNodeId),
      TypeCatalog.getNamedTypeOptions(plan.rootNode, plan.signatureNodeId),
    )
    if (structureError != null) {
      return `The Signature cannot be defined at this destination: ${structureError}`
    }

    const functionNode = TreeNode.findNode(plan.rootNode, plan.functionNodeId)
    if (functionNode?.element.kind !== 'function') {
      return 'The source Function is no longer available.'
    }
    if (
      functionNode.element.signature.mode !== 'refer'
      || functionNode.element.signature.signatureTypeId !== signatureNode.element.typeId
    ) {
      return 'The extracted Signature is not visible from the source Function.'
    }
    if (!TypeCatalog.collectVisibleSignatures(plan.rootNode, plan.functionNodeId)
      .some((entry) => entry.node.id === plan.signatureNodeId)) {
      return 'The extracted Signature is not visible from the source Function.'
    }
    const resolved = {
      async: signatureNode.element.async,
      parameters: signatureNode.element.parameters,
      returnType: signatureNode.element.returnType,
    }
    return JSON.stringify(resolved) === JSON.stringify(expectedDefinition)
      ? null
      : 'The extracted Signature would change the Function contract.'
  }

  export const canPlaceAt = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
    destinationNode: TreeNode.Node,
  ): boolean => {
    const sourceNode = TreeNode.findNode(rootNode, functionNodeId)
    if (
      sourceNode?.element.kind !== 'function'
      || sourceNode.element.signature.mode !== 'inline'
      || !TreeTransferCatalog.canContainKind(rootNode, destinationNode, 'signature-type')
      || TreeNode.isDescendantOrSelf(rootNode, functionNodeId, destinationNode.id)
    ) return false

    try {
      const plan = createCandidate(
        rootNode,
        functionNodeId,
        destinationNode.id,
        'ExtractedSignature',
        'signature-extraction-preview',
      )
      return validateCandidate(plan, sourceNode.element.signature.definition) == null
    } catch {
      return false
    }
  }

  export const validateName = (
    rootNode: TreeNode.Node,
    destinationNode: TreeNode.Node,
    name: string,
  ): string | null => TreeTransferCatalog.validateName(
    rootNode,
    destinationNode,
    'signature-type',
    name,
  )

  export const plan = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
    destinationNodeId: number,
    signatureName: string,
  ): Plan => {
    const sourceNode = TreeNode.findNode(rootNode, functionNodeId)
    const destinationNode = TreeNode.findNode(rootNode, destinationNodeId)
    if (sourceNode?.element.kind !== 'function') {
      throw new Error('The source Function is no longer available.')
    }
    if (sourceNode.element.signature.mode !== 'inline') {
      throw new Error('Only a Function with an Inline Signature can be extracted.')
    }
    if (destinationNode == null) {
      throw new Error('The selected destination is no longer available.')
    }
    const nameError = validateName(rootNode, destinationNode, signatureName)
    if (nameError != null) throw new Error(nameError)

    const result = createCandidate(
      rootNode,
      functionNodeId,
      destinationNodeId,
      signatureName,
      crypto.randomUUID(),
    )
    const validationError = validateCandidate(
      result,
      sourceNode.element.signature.definition,
    )
    if (validationError != null) throw new Error(validationError)

    const signature = TreeNode.findNode(result.rootNode, result.signatureNodeId)?.element
    if (signature?.kind !== 'signature-type') {
      throw new Error('The extracted Signature Type was not created.')
    }
    const visible = TypeCatalog.collectVisibleSignatures(
      result.rootNode,
      result.functionNodeId,
    ).some((entry) => entry.node.id === result.signatureNodeId)
    if (!visible) {
      throw new Error('The extracted Signature is not visible from the source Function.')
    }

    return result
  }
}

export default FunctionSignatureExtraction
