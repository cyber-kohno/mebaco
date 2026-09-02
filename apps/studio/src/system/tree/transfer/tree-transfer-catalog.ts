import ElementEditSchema from '../../element-dialog/element-edit-schema'
import type MebacoElement from '../../element/element'
import TypeCatalog from '../../element/kind/type/type-catalog'
import TreeNode from '../tree-node'

namespace TreeTransferCatalog {
  export type TransferableKind =
    | 'style'
    | 'object-type'
    | 'union-type'
    | 'signature-type'

  const kinds = new Set<MebacoElement.Kind>([
    'style',
    'object-type',
    'union-type',
    'signature-type',
  ])

  export const isTransferableKind = (
    kind: MebacoElement.Kind,
  ): kind is TransferableKind => kinds.has(kind)

  export const getLabel = (
    element: MebacoElement.Element,
  ): string => {
    switch (element.kind) {
      case 'style':
      case 'object-type':
      case 'union-type':
      case 'signature-type':
        return element.id
      default:
        return element.kind
    }
  }

  const isTypeKind = (
    kind: MebacoElement.Kind,
  ): kind is Exclude<TransferableKind, 'style'> => (
    kind === 'object-type'
    || kind === 'union-type'
    || kind === 'signature-type'
  )

  const isUnder = (
    rootNode: TreeNode.Node,
    nodeId: number,
    ancestorKind: MebacoElement.Kind,
  ): boolean => TreeNode.findPath(rootNode, nodeId)?.some(
    (node) => node.element.kind === ancestorKind,
  ) === true

  const isControlBranch = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): boolean => {
    if (!['if', 'else-if', 'else', 'case', 'default'].includes(node.element.kind)) {
      return false
    }
    const parent = TreeNode.findParent(rootNode, node.id)
    return parent?.element.kind === 'control-conditional'
      || parent?.element.kind === 'control-switch'
  }

  export const canContainKind = (
    rootNode: TreeNode.Node,
    destinationNode: TreeNode.Node,
    sourceKind: TransferableKind,
  ): boolean => {
    if (sourceKind === 'style') {
      return destinationNode.element.kind === 'styles'
        || destinationNode.element.kind === 'retention'
        || (
          destinationNode.element.kind === 'block'
          && isUnder(rootNode, destinationNode.id, 'retention')
        )
    }

    return destinationNode.element.kind === 'types'
      || destinationNode.element.kind === 'retention'
      || destinationNode.element.kind === 'function-procedure'
      || destinationNode.element.kind === 'promise-then'
      || destinationNode.element.kind === 'promise-catch'
      || (
        destinationNode.element.kind === 'block'
        && (
          isUnder(rootNode, destinationNode.id, 'retention')
          || isUnder(rootNode, destinationNode.id, 'function-procedure')
        )
      )
      || isControlBranch(rootNode, destinationNode)
  }

  export const canPasteTo = (
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    destinationNode: TreeNode.Node,
    operation: 'copy' | 'move',
  ): boolean => {
    if (!isTransferableKind(sourceNode.element.kind)) return false
    if (operation === 'move') {
      if (sourceNode.id === destinationNode.id) return false
      if (TreeNode.isDescendantOrSelf(rootNode, sourceNode.id, destinationNode.id)) return false
      if (TreeNode.findParent(rootNode, sourceNode.id)?.id === destinationNode.id) return false
    }

    if (
      sourceNode.element.kind !== 'style'
      && !isTypeKind(sourceNode.element.kind)
    ) return false
    return canContainKind(rootNode, destinationNode, sourceNode.element.kind)
  }

  const collectReservedNames = (
    rootNode: TreeNode.Node,
    destinationNode: TreeNode.Node,
    sourceKind: TransferableKind,
  ): string[] => {
    if (sourceKind === 'style') {
      return destinationNode.children.flatMap((child) => (
        child.element.kind === 'style' ? [child.element.id] : []
      ))
    }
    const siblingTypeNames = destinationNode.children.flatMap((child) => {
      switch (child.element.kind) {
        case 'object-type':
        case 'union-type':
        case 'signature-type':
          return [child.element.id]
        default:
          return []
      }
    })
    return [...new Set([
      ...TypeCatalog.collectVisibleNamedTypes(rootNode, destinationNode.id)
        .map((entry) => entry.element.id),
      ...siblingTypeNames,
    ])]
  }

  export const validateName = (
    rootNode: TreeNode.Node,
    destinationNode: TreeNode.Node,
    sourceKind: TransferableKind,
    name: string,
  ): string | null => ElementEditSchema.validateText({
    type: 'text',
    key: 'id',
    label: 'Id',
    required: true,
    charset: sourceKind === 'style' ? 'identifier' : 'pascalIdentifier',
    minLength: 1,
    maxLength: 32,
    reservedNames: collectReservedNames(rootNode, destinationNode, sourceKind),
  }, name)

  export const getInsertIndex = (
    _destinationNode: TreeNode.Node,
  ): number | undefined => undefined
}

export default TreeTransferCatalog
