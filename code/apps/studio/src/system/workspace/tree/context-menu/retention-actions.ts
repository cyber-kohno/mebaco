import type ActionMenuState from '@system/ui/action-menu/action-menu-state'
import type TreeNode from '@system/model/tree/tree-node'
import ActionMenu from '@system/ui/action-menu/action-menu-state'
import ActionElementDefinition from '@system/workspace/element-definition/variable/action-element-definition'
import Component from '@system/model/component/component'
import ComponentElementDefinition from '@system/workspace/element-definition/component/component-element-definition'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import ObjectTypeElementDefinition from '@system/workspace/element-definition/type-system/object/object-type-element-definition'
import StyleElement from '@system/workspace/element-definition/view/style/style-element-definition'
import StyleParameterCatalog from '@system/model/view/style/style-parameter-catalog'
import TypeCatalog from '@system/model/type-system/type-catalog'
import UnionTypeElementDefinition from '@system/workspace/element-definition/type-system/union/union-type-element-definition'
import SignatureTypeElementDefinition from '@system/workspace/element-definition/type-system/signature/signature-type-element-definition'
import VariableElementDefinition from '@system/workspace/element-definition/variable/variable-element-definition'
import FunctionActions from './function-actions'
import ControlConditional from '@system/model/directive/control-conditional'
import Switch from '@system/model/directive/switch'
import ControlSwitchElementDefinition from '@system/workspace/element-definition/directive/control-switch-element-definition'
import TreeStore from '@system/workspace/tree/state'
import TransitionElementDefinition from '@system/workspace/element-definition/variable/transition-element-definition'
import StyleReferencePreview from '@system/runtime/style/style-reference-preview'

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
      child.element.kind === 'component' && Component.isLocal(child.element)
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
        VariableElementDefinition.createSchema({
          reservedNames: variableNames,
          referenceOptions: TypeCatalog.getReferenceOptions(rootNode, parentNodeId),
          namedTypeOptions: TypeCatalog.getNamedTypeOptions(rootNode, parentNodeId),
        }),
      )),
      FunctionActions.createAddFunctionItem(parentNodeId, rootNode),
      action('Local component', () => ElementDialog.openCreate(
        parentNodeId,
        ComponentElementDefinition.createSchema({
          reservedNames: localComponentNames,
          local: true,
        }),
      )),
      action('Style', () => ElementDialog.openCreate(
        parentNodeId,
        StyleElement.createSchema({
          reservedNames: styleNames,
          styleOptions: StyleElement.getStyleOptions(rootNode),
          categoryOptions: StyleElement.getCategoryOptions(rootNode),
          styleCatalog: StyleParameterCatalog.createCatalog(rootNode),
          getStylePreview: StyleReferencePreview.createResolver(rootNode),
        }),
      )),
      action('Object', () => ElementDialog.openCreate(
        parentNodeId,
        ObjectTypeElementDefinition.createSchema({
          reservedNames: typeNames,
          objectOptions,
        }),
      )),
      action('Union', () => ElementDialog.openCreate(
        parentNodeId,
        UnionTypeElementDefinition.createSchema({
          reservedNames: typeNames,
          objectOptions,
        }),
      )),
      action('Signature', () => ElementDialog.openCreate(
        parentNodeId,
        SignatureTypeElementDefinition.createSchema({
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
    return action('Action', () => ElementDialog.openCreate(
      parentNodeId,
      ActionElementDefinition.createSchema(),
    ))
  }

  export const createAddTransitionItem = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Transition', () => ElementDialog.openCreate(
      parentNodeId,
      TransitionElementDefinition.createSchema(rootNode, parentNodeId),
    ))
  }

  export const createAddStatementMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ParentItem => {
    const { parent } = ActionMenu.createFactory()
    return parent('Add statement', [
      createAddActionItem(parentNodeId),
      createAddTransitionItem(parentNodeId, rootNode),
    ])
  }

  export const createAddControlMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()
    return parent('Add directive', [
      action('Conditional', () => TreeStore.addChild(parentNodeId, ControlConditional.create())),
      action('Switch', () => ElementDialog.openCreate(
        parentNodeId,
        ControlSwitchElementDefinition.createSchema({
          literalUnionOptions: Switch.getLiteralUnionOptions(rootNode, parentNodeId),
        }),
      )),
    ])
  }
}

export default RetentionActions
