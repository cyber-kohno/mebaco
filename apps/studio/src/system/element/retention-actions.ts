import type ActionMenuState from '../action-menu/action-menu-state'
import type TreeNode from '../tree/tree-node'
import ActionMenu from '../action-menu/action-menu-state'
import ActionElement from './kind/variable/action-element'
import ComponentElement from './kind/component/definition/component-element'
import ElementDialog from '../element-dialog/element-dialog-controller'
import ObjectTypeElement from './kind/type/object-type-element'
import StyleElement from './kind/view/style-element'
import StyleParameterCatalog from './kind/view/style-parameter-catalog'
import TypeCatalog from './kind/type/type-catalog'
import UnionTypeElement from './kind/type/union-type-element'
import SignatureTypeElement from './kind/type/signature-type-element'
import VariableElement from './kind/variable/variable-element'
import FunctionActions from './function-actions'
import ControlConditionalElement from './kind/directive/control-conditional-element'
import ControlSwitchElement from './kind/directive/control-switch-element'
import TreeStore from '../store/tree-store'
import SwitchElement from './kind/directive/switch-element'
import TransitionElement from './kind/variable/transition-element'

namespace RetentionActions {
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

  const collectSiblingVariableNames = (
    rootNode: TreeNode.Node,
    parentNodeId: number,
  ): string[] => (
    findNode(rootNode, parentNodeId)?.children.flatMap((child) => (
      child.element.kind === 'variable' ? [child.element.id] : []
    )) ?? []
  )

  const collectSiblingLocalComponentNames = (
    rootNode: TreeNode.Node,
    parentNodeId: number,
  ): string[] => (
    findNode(rootNode, parentNodeId)?.children.flatMap((child) => (
      child.element.kind === 'component' && ComponentElement.isLocal(child.element)
        ? [child.element.id]
        : []
    )) ?? []
  )

  export const createAddDeclareMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()
    const variableNames = collectSiblingVariableNames(rootNode, parentNodeId)
    const localComponentNames = collectSiblingLocalComponentNames(rootNode, parentNodeId)
    const typeNames = TypeCatalog.collectVisibleNamedTypes(rootNode, parentNodeId)
      .map((entry) => entry.element.id)
    const objectOptions = TypeCatalog.getObjectOptions(rootNode, parentNodeId)
    const namedTypeOptions = TypeCatalog.getNamedTypeOptions(rootNode, parentNodeId)
    const styleNames = StyleElement.getStyleOptions(rootNode)
      .map((option) => option.value)

    return parent('Add declare', [
      action('Variable', () => ElementDialog.openCreate(
        parentNodeId,
        VariableElement.createSchema({
          reservedNames: variableNames,
          referenceOptions: TypeCatalog.getReferenceOptions(rootNode, parentNodeId),
          namedTypeOptions: TypeCatalog.getNamedTypeOptions(rootNode, parentNodeId),
        }),
      )),
      FunctionActions.createAddFunctionItem(parentNodeId, rootNode),
      action('Local Component', () => ElementDialog.openCreate(
        parentNodeId,
        ComponentElement.createSchema({
          reservedNames: localComponentNames,
          local: true,
        }),
      )),
      action('Style', () => ElementDialog.openCreate(
        parentNodeId,
        StyleElement.createSchema({
          reservedNames: styleNames,
          styleOptions: StyleElement.getStyleOptions(rootNode),
          styleCatalog: StyleParameterCatalog.createCatalog(rootNode),
        }),
      )),
      action('Object', () => ElementDialog.openCreate(
        parentNodeId,
        ObjectTypeElement.createSchema({
          reservedNames: typeNames,
          objectOptions,
        }),
      )),
      action('Union', () => ElementDialog.openCreate(
        parentNodeId,
        UnionTypeElement.createSchema({
          reservedNames: typeNames,
          objectOptions,
        }),
      )),
      action('Signature', () => ElementDialog.openCreate(
        parentNodeId,
        SignatureTypeElement.createSchema({
          reservedNames: typeNames,
          objectOptions,
          namedTypeOptions,
        }),
      )),
    ])
  }

  export const createAddActionItem = (
    parentNodeId: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Add Action', () => ElementDialog.openCreate(
      parentNodeId,
      ActionElement.createSchema(),
    ))
  }

  export const createAddTransitionItem = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Transition', () => ElementDialog.openCreate(
      parentNodeId,
      TransitionElement.createSchema(rootNode),
    ))
  }

  export const createAddControlMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()
    return parent('Add directive', [
      action('Conditional', () => TreeStore.addChild(parentNodeId, ControlConditionalElement.create())),
      action('Switch', () => ElementDialog.openCreate(
        parentNodeId,
        ControlSwitchElement.createSchema({
          literalUnionOptions: SwitchElement.getLiteralUnionOptions(rootNode, parentNodeId),
        }),
      )),
    ])
  }
}

export default RetentionActions
