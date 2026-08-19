import type ActionMenuState from '../action-menu/action-menu-state'
import type TreeNode from '../tree/tree-node'
import ActionMenu from '../action-menu/action-menu-state'
import ActionElement from './kind/variable/action-element'
import ElementDialog from '../element-dialog/element-dialog-controller'
import FunctionElement from './kind/function/function-element'
import FunctionReturnElement from './kind/function/function-return-element'
import ObjectTypeElement from './kind/type/object-type-element'
import TreeStore from '../store/tree-store'
import TypeCatalog from './kind/type/type-catalog'
import UnionTypeElement from './kind/type/union-type-element'
import ValueTypeDefinition from './kind/type/value-type-definition'
import VariableElement from './kind/variable/variable-element'
import FunctionScope from './kind/function/function-scope'

namespace FunctionActions {
  const findNode = (
    node: TreeNode.Node,
    targetNodeId: number,
  ): TreeNode.Node | null => {
    if (node.id === targetNodeId) return node
    for (const child of node.children) {
      const found = findNode(child, targetNodeId)
      if (found != null) return found
    }
    return null
  }

  const getFrameNode = (
    rootNode: TreeNode.Node,
    parentNodeId: number,
  ): TreeNode.Node | null => (
    FunctionScope.findFrameNode(rootNode, parentNodeId)
    ?? findNode(rootNode, parentNodeId)
  )

  const collectFrameIds = (
    rootNode: TreeNode.Node,
    parentNodeId: number,
    kind: 'variable' | 'function',
  ): string[] => {
    const frameNode = getFrameNode(rootNode, parentNodeId)
    if (frameNode == null) return []
    return kind === 'function'
      ? FunctionScope.collectFrameFunctions(frameNode).map((entry) => entry.element.id)
      : FunctionScope.collectFrameVariables(frameNode).map((entry) => entry.element.id)
  }

  export const createAddFunctionItem = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
    insertIndex?: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Add Function', () => ElementDialog.openCreate(
      parentNodeId,
      FunctionElement.createSchema({
        reservedNames: collectFrameIds(rootNode, parentNodeId, 'function'),
        referenceOptions: TypeCatalog.getReferenceOptions(rootNode, parentNodeId),
        namedTypeOptions: TypeCatalog.getNamedTypeOptions(rootNode, parentNodeId),
      }),
      insertIndex,
    ))
  }

  export const createAddDeclareMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
    insertIndex?: number,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()
    const frameNode = getFrameNode(rootNode, parentNodeId)
    const typeNames = frameNode == null ? [] : FunctionScope.collectFrameTypeNames(frameNode)
    const referenceOptions = TypeCatalog.getReferenceOptions(rootNode, parentNodeId)
    const namedTypeOptions = TypeCatalog.getNamedTypeOptions(rootNode, parentNodeId)
    const objectOptions = TypeCatalog.getObjectOptions(rootNode, parentNodeId)

    return parent('Add declare', [
      action('Variable', () => ElementDialog.openCreate(
        parentNodeId,
        VariableElement.createSchema({
          reservedNames: collectFrameIds(rootNode, parentNodeId, 'variable'),
          referenceOptions,
          namedTypeOptions,
        }),
        insertIndex,
      )),
      createAddFunctionItem(parentNodeId, rootNode, insertIndex),
      action('Object', () => ElementDialog.openCreate(
        parentNodeId,
        ObjectTypeElement.createSchema({
          reservedNames: typeNames,
          objectOptions,
          namedTypeOptions,
        }),
        insertIndex,
      )),
      action('Union', () => ElementDialog.openCreate(
        parentNodeId,
        UnionTypeElement.createSchema({ reservedNames: typeNames, objectOptions }),
        insertIndex,
      )),
    ])
  }

  export const createAddActionItem = (
    parentNodeId: number,
    insertIndex?: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Add Action', () => ElementDialog.openCreate(
      parentNodeId,
      ActionElement.createSchema(),
      insertIndex,
    ))
  }

  export const createAddBlockItem = (
    parentNodeId: number,
    insertIndex?: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Add Block', () => TreeStore.addChild(
      parentNodeId,
      { kind: 'block', label: '' },
      insertIndex,
    ))
  }

  export const createReturnSchema = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ) => {
    const returnType = FunctionScope.findOwnerFunction(rootNode, targetNodeId)
      ?.element.returnType ?? null
    return FunctionReturnElement.createSchema({
      required: returnType != null,
      expectedTypeText: returnType == null
        ? undefined
        : ValueTypeDefinition.getTypeText(
            returnType,
            (id) => TypeCatalog.resolveTypeName(rootNode, id),
          ),
    })
  }

  export const createAddReturnItem = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Add Return', () => ElementDialog.openCreate(
      parentNodeId,
      createReturnSchema(rootNode, parentNodeId),
    ))
  }
}

export default FunctionActions
