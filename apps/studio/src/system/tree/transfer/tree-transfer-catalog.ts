import ElementEditSchema from '../../element-dialog/element-edit-schema'
import type MebacoElement from '../../element/element'
import TypeCatalog from '../../element/kind/type/type-catalog'
import FunctionScope from '../../element/kind/function/function-scope'
import ContentPlacement from '../../element/content-placement'
import TreeNode from '../tree-node'

namespace TreeTransferCatalog {
  export type TransferableKind =
    | 'app'
    | 'style'
    | 'object-type'
    | 'union-type'
    | 'signature-type'
    | 'function'
    | 'component'
    | 'tag'

  export type MovableKind =
    | 'style'
    | 'object-type'
    | 'union-type'
    | 'signature-type'
    | 'function'
    | 'component'
    | 'tag'

  export type TransferableElement = Extract<
    MebacoElement.Element,
    { kind: TransferableKind }
  >

  export type MovableElement = Extract<
    MebacoElement.Element,
    { kind: MovableKind }
  >

  const kinds = new Set<MebacoElement.Kind>([
    'app',
    'style',
    'object-type',
    'union-type',
    'signature-type',
    'function',
    'component',
    'tag',
  ])

  const movableKinds = new Set<MebacoElement.Kind>([
    'style',
    'object-type',
    'union-type',
    'signature-type',
    'function',
    'component',
    'tag',
  ])

  export const isTransferableKind = (
    kind: MebacoElement.Kind,
  ): kind is TransferableKind => kinds.has(kind)

  export const isMovableKind = (
    kind: MebacoElement.Kind,
  ): kind is MovableKind => movableKinds.has(kind)

  export const isTransferable = (
    element: MebacoElement.Element,
  ): element is TransferableElement => isTransferableKind(element.kind)
    && (element.kind !== 'component' || element.local !== true)

  export const isMovable = (
    element: MebacoElement.Element,
  ): element is MovableElement => isMovableKind(element.kind)
    && (element.kind !== 'component' || element.local !== true)

  export const getLabel = (
    element: MebacoElement.Element,
  ): string => {
    switch (element.kind) {
      case 'app':
      case 'style':
      case 'object-type':
      case 'union-type':
      case 'signature-type':
      case 'function':
      case 'component':
        return element.id
      case 'tag':
        return `<${element.tagName}>`
      default:
        return element.kind
    }
  }

  const isTypeKind = (
    kind: MebacoElement.Kind,
  ): kind is Exclude<TransferableKind, 'app' | 'style' | 'function' | 'component' | 'tag'> => (
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
    if (sourceKind === 'app') {
      return destinationNode.element.kind === 'apps'
    }

    if (sourceKind === 'tag') {
      return ContentPlacement.canAcceptViewChild(rootNode, destinationNode)
    }

    if (sourceKind === 'component') {
      return destinationNode.element.kind === 'components'
    }

    if (sourceKind === 'style') {
      return destinationNode.element.kind === 'styles'
        || destinationNode.element.kind === 'retention'
        || (
          destinationNode.element.kind === 'block'
          && isUnder(rootNode, destinationNode.id, 'retention')
        )
    }

    if (sourceKind === 'function') {
      if (
        destinationNode.element.kind === 'functions'
        || destinationNode.element.kind === 'retention'
        || destinationNode.element.kind === 'function-procedure'
        || destinationNode.element.kind === 'promise-then'
        || destinationNode.element.kind === 'promise-catch'
      ) return true
      if (
        destinationNode.element.kind !== 'block'
        && !isControlBranch(rootNode, destinationNode)
      ) return false
      const frame = FunctionScope.findFrameNode(rootNode, destinationNode.id)
      return frame != null && frame.element.kind !== 'functions'
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
    if (!isTransferable(sourceNode.element)) return false
    if (operation === 'move') {
      if (!isMovable(sourceNode.element)) return false
      if (sourceNode.id === destinationNode.id) return false
      if (TreeNode.isDescendantOrSelf(rootNode, sourceNode.id, destinationNode.id)) return false
      if (TreeNode.findParent(rootNode, sourceNode.id)?.id === destinationNode.id) return false
    }

    if (
      sourceNode.element.kind !== 'app'
      && sourceNode.element.kind !== 'style'
      && sourceNode.element.kind !== 'function'
      && sourceNode.element.kind !== 'component'
      && sourceNode.element.kind !== 'tag'
      && !isTypeKind(sourceNode.element.kind)
    ) return false
    return canContainKind(rootNode, destinationNode, sourceNode.element.kind)
  }

  const collectReservedNames = (
    rootNode: TreeNode.Node,
    destinationNode: TreeNode.Node,
    sourceKind: TransferableKind,
  ): string[] => {
    if (sourceKind === 'app') {
      return destinationNode.children.flatMap((child) => (
        child.element.kind === 'app' ? [child.element.id] : []
      ))
    }
    if (sourceKind === 'component') {
      return destinationNode.children.flatMap((child) => (
        child.element.kind === 'component' ? [child.element.id] : []
      ))
    }
    if (sourceKind === 'function') {
      const frame = FunctionScope.findFrameNode(rootNode, destinationNode.id)
      return [...new Set([
        ...(frame == null
          ? []
          : FunctionScope.collectFrameFunctions(frame).map((entry) => entry.element.id)),
        ...destinationNode.children.flatMap((child) => (
          child.element.kind === 'function' ? [child.element.id] : []
        )),
      ])]
    }
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
  ): string | null => sourceKind === 'tag'
    ? null
    : ElementEditSchema.validateText({
      type: 'text',
      key: 'id',
      label: 'Id',
      required: true,
      charset: sourceKind === 'app'
        ? 'strictKebabIdentifier'
        : sourceKind === 'style'
          ? 'identifier'
        : sourceKind === 'function'
          ? 'jsIdentifier'
          : 'pascalIdentifier',
      minLength: 1,
      maxLength: 32,
      reservedNames: collectReservedNames(rootNode, destinationNode, sourceKind),
    }, name)

  export const requiresName = (
    kind: TransferableKind,
  ): boolean => kind !== 'tag'

  export const getInsertIndex = (
    _destinationNode: TreeNode.Node,
  ): number | undefined => undefined
}

export default TreeTransferCatalog
