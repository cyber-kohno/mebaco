import type TreeNode from '../../../tree/tree-node'
import TypeCatalog from '../type/type-catalog'
import type SignatureDefinition from '../type/signature/signature-definition'

namespace FunctionDefinition {
  export type Kind = 'function'
  export type SignatureMode = 'inline' | 'refer'
  export type ImplementationMode = 'code' | 'procedure'

  export type InlineSignature = {
    mode: 'inline'
    definition: SignatureDefinition.Definition
  }

  export type ReferSignature = {
    mode: 'refer'
    signatureTypeId: string
  }

  export type Signature = InlineSignature | ReferSignature

  export type CodeImplementation = {
    mode: 'code'
    source: string
  }

  export type ProcedureImplementation = {
    mode: 'procedure'
  }

  export type Implementation = CodeImplementation | ProcedureImplementation

  export type Element = {
    kind: Kind
    id: string
    signature: Signature
    implementation: Implementation
  }

  export const resolveSignature = (
    rootNode: TreeNode.Node,
    element: Element,
  ): SignatureDefinition.Definition | null => {
    if (element.signature.mode === 'inline') return element.signature.definition
    const signature = TypeCatalog.findSignature(
      rootNode,
      element.signature.signatureTypeId,
    )?.element
    return signature == null
      ? null
      : {
          async: signature.async,
          parameters: signature.parameters,
          returnType: signature.returnType,
        }
  }

  export const getAsync = (
    rootNode: TreeNode.Node,
    element: Element,
  ): boolean => resolveSignature(rootNode, element)?.async ?? false

  export const getParameters = (
    rootNode: TreeNode.Node,
    element: Element,
  ): readonly SignatureDefinition.Parameter[] => resolveSignature(rootNode, element)?.parameters ?? []

  export const getReturnType = (
    rootNode: TreeNode.Node,
    element: Element,
  ): SignatureDefinition.Definition['returnType'] => resolveSignature(rootNode, element)?.returnType ?? null
}

export default FunctionDefinition
