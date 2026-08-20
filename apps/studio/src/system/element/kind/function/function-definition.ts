import type TreeNode from '../../../tree/tree-node'
import TypeCatalog from '../type/type-catalog'
import type ValueTypeDefinition from '../type/value-type-definition'
import type SignatureTypeElement from '../type/signature-type-element'

namespace FunctionDefinition {
  export type Kind = 'function'
  export type Mode = 'inline' | 'refer'

  export type Inline = {
    kind: Kind
    id: string
    mode: 'inline'
    async: boolean
    returnType: ValueTypeDefinition.Definition | null
  }

  export type Refer = {
    kind: Kind
    id: string
    mode: 'refer'
    signatureTypeId: string
  }

  export type Element = Inline | Refer

  export const resolveSignature = (
    rootNode: TreeNode.Node,
    element: Element,
  ): SignatureTypeElement.Element | null => element.mode === 'refer'
    ? TypeCatalog.findSignature(rootNode, element.signatureTypeId)?.element ?? null
    : null

  export const getAsync = (
    rootNode: TreeNode.Node,
    element: Element,
  ): boolean => element.mode === 'inline'
    ? element.async
    : resolveSignature(rootNode, element)?.async ?? false

  export const getReturnType = (
    rootNode: TreeNode.Node,
    element: Element,
  ): ValueTypeDefinition.Definition | null => element.mode === 'inline'
    ? element.returnType
    : resolveSignature(rootNode, element)?.returnType ?? null
}

export default FunctionDefinition
