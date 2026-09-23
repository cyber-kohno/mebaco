import type ActionMenuState from '@system/ui/action-menu/action-menu-state'
import type TreeNode from '@system/model/tree/tree-node'
import ActionMenu from '@system/ui/action-menu/action-menu-state'
import ComponentUse from '@system/model/component/component-use'
import ComponentUseElementDefinition from '@system/workspace/element-definition/component/component-use-element-definition'
import Conditional from '@system/model/directive/conditional'
import ContentHost from '@system/model/element/content-host'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import StyleParameterCatalog from '@system/model/view/style/style-parameter-catalog'
import TagElement from '@system/workspace/element-definition/view/tag-element-definition'
import TextElementDefinition from '@system/workspace/element-definition/view/text-element-definition'
import TreeStore from '@system/workspace/tree/state'
import Switch from '@system/model/directive/switch'
import SwitchElementDefinition from '@system/workspace/element-definition/directive/switch-element-definition'
import LoopElementDefinition from '@system/workspace/element-definition/directive/loop-element-definition'
import SlotUse from '@system/model/component/slot-use'
import SlotUseElementDefinition from '@system/workspace/element-definition/component/slot-use-element-definition'
import { AppSettings } from '@system/application/settings'
import StyleReferencePreview from '@system/runtime/style/style-reference-preview'

namespace ContentActions {
  export const createAddMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()

    const items: ActionMenuState.Item[] = [
      action('Tag', () => {
        ElementDialog.openCreate(
          parentNodeId,
          TagElement.createSchema({
            styleOptions: TagElement.getStyleOptions(rootNode),
            styleCatalog: StyleParameterCatalog.createCatalog(rootNode),
            getStylePreview: StyleReferencePreview.createResolver(rootNode),
          }),
        )
      }),
      action('Text content', () => {
        ElementDialog.openCreate(parentNodeId, TextElementDefinition.createSchema())
      }),
      action('Component', () => {
        ElementDialog.openCreate(
          parentNodeId,
          ComponentUseElementDefinition.createSchema({
            components: ComponentUse.getComponents(rootNode, parentNodeId),
          }),
        )
      }),
    ]
    const slotOptions = SlotUse.getOptions(rootNode, parentNodeId)
    if (slotOptions.length > 0) {
      items.push(action('Slot content', () => {
        ElementDialog.openCreate(
          parentNodeId,
          SlotUseElementDefinition.createSchema(slotOptions),
        )
      }))
    }
    return parent('Add view', items)
  }

  export const createAddDirectiveMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()

    return parent('Add directive', [
      action('Conditional', () => {
        TreeStore.addChild(parentNodeId, Conditional.create())
      }),
      action('Switch', () => {
        ElementDialog.openCreate(
          parentNodeId,
          SwitchElementDefinition.createSchema({
            literalUnionOptions: Switch.getLiteralUnionOptions(rootNode, parentNodeId),
          }),
        )
      }),
      action('Loop', () => {
        const defaults = AppSettings.getElementDefaults()
        ElementDialog.openCreate(
          parentNodeId,
          LoopElementDefinition.createSchema({
            initialItemId: defaults.loopItemVariableName,
            initialIndexId: defaults.loopIndexVariableName,
          }),
        )
      }),
    ])
  }

  export const createAddBlockItem = (
    parentNodeId: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()

    return action('Add block', () => {
      TreeStore.addChild(parentNodeId, { kind: 'block', label: '' })
    })
  }

  export const createOptionalRetentionItems = (
    node: TreeNode.Node,
    rootNode: TreeNode.Node,
  ): ActionMenuState.Item[] => {
    const { action } = ActionMenu.createFactory()

    if (ContentHost.usesRetention(node)) {
      return ContentHost.canRemoveRetention(node)
        ? [action('Remove retention', () => {
            TreeStore.transformNode(node.id, ContentHost.removeRetention)
          })]
        : []
    }

    return [
      createAddMenu(node.id, rootNode),
      createAddDirectiveMenu(node.id, rootNode),
      createAddBlockItem(node.id),
      action('Use retention', () => {
        TreeStore.transformNode(node.id, ContentHost.useRetention)
      }),
    ]
  }
}

export default ContentActions
