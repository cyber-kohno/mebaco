import ObjectShape from '../../element/kind/type/object/object-shape'
import SignatureDefinition from '../../element/kind/type/signature/signature-definition'
import TypeCatalog from '../../element/kind/type/type-catalog'
import UnionDefinition from '../../element/kind/type/union/union-definition'
import StyleParameterCatalog from '../../element/kind/view/style/style-parameter-catalog'
import ExpressionVerificationRunner from '../../validation/expression/expression-verification-runner'
import TreeNode from '../tree-node'

namespace TreeTransferValidator {
  export const validateStructure = (
    rootNode: TreeNode.Node,
    copiedNodeId: number,
  ): string | null => {
    const copiedNode = TreeNode.findNode(rootNode, copiedNodeId)
    if (copiedNode == null) return `node-${copiedNodeId} was not found.`

    switch (copiedNode.element.kind) {
      case 'style': {
        const issue = StyleParameterCatalog.createCatalog(rootNode)
          .resolve(copiedNode.element.styleId)
          .issues[0]
        return issue?.message ?? null
      }
      case 'object-type':
        return ObjectShape.validate(
          ObjectShape.create(
            copiedNode.element.properties,
            copiedNode.element.baseObjectIds,
          ),
          TypeCatalog.getObjectOptions(rootNode, copiedNodeId),
          TypeCatalog.getNamedTypeOptions(rootNode, copiedNodeId),
        )
      case 'union-type':
        return UnionDefinition.validate(
          copiedNode.element.definition,
          TypeCatalog.getObjectOptions(rootNode, copiedNodeId),
        )
      case 'signature-type':
        return SignatureDefinition.validate(
          {
            async: copiedNode.element.async,
            parameters: copiedNode.element.parameters,
            returnType: copiedNode.element.returnType,
          },
          TypeCatalog.getObjectOptions(rootNode, copiedNodeId),
          TypeCatalog.getNamedTypeOptions(rootNode, copiedNodeId),
        )
      default:
        return 'This element cannot be copied.'
    }
  }

  export const validateExpressionScope = async (
    previousRoot: TreeNode.Node,
    sourceNodeId: number,
    candidateRoot: TreeNode.Node,
    copiedNodeId: number,
  ): Promise<string | null> => {
    const sourceNode = TreeNode.findNode(previousRoot, sourceNodeId)
    const copiedNode = TreeNode.findNode(candidateRoot, copiedNodeId)
    if (sourceNode == null || copiedNode == null) return 'The copy source is no longer available.'

    const [previous, copied] = await Promise.all([
      ExpressionVerificationRunner.verify(previousRoot, sourceNode),
      ExpressionVerificationRunner.verify(candidateRoot, copiedNode),
    ])
    if (copied?.status !== 'error') return null
    const previousMessages = new Set(previous?.status === 'error' ? previous.messages : [])
    const introduced = copied.messages.filter((message) => !previousMessages.has(message))
    return introduced.length === 0
      ? null
      : `The copied element is not valid in this scope: ${introduced.join(' ')}`
  }
}

export default TreeTransferValidator
