import type ActionMenuState from '../action-menu/action-menu-state'
import type TreeNode from '../tree/tree-node'
import ActionMenu from '../action-menu/action-menu-state'
import ComponentUseElement from './kind/component/reference/component-use-element'
import ConditionalElement from './kind/directive/conditional-element'
import ContentHost from './content-host'
import ElementDialog from '../element-dialog/element-dialog-controller'
import StyleResolver from './kind/view/style-resolver'
import TagElement from './kind/view/tag-element'
import TextElement from './kind/view/text-element'
import TreeStore from '../store/tree-store'
import SwitchElement from './kind/directive/switch-element'
import LoopElement from './kind/directive/loop-element'
import SlotUseElement from './kind/component/definition/slot/slot-use-element'

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
            styleCatalog: StyleResolver.createCatalog(rootNode),
          }),
        )
      }),
      action('Text', () => {
        ElementDialog.openCreate(parentNodeId, TextElement.createSchema())
      }),
      action('Component', () => {
        ElementDialog.openCreate(
          parentNodeId,
          ComponentUseElement.createSchema({
            components: ComponentUseElement.getComponents(rootNode, parentNodeId),
          }),
        )
      }),
    ]
    const slotOptions = SlotUseElement.getOptions(rootNode, parentNodeId)
    if (slotOptions.length > 0) {
      items.push(action('Slot content', () => {
        ElementDialog.openCreate(
          parentNodeId,
          SlotUseElement.createSchema(slotOptions),
        )
      }))
    }
    return parent('Add view', items)
  }

  export const createAddDirectiveMenu = (
    parentNodeId: number,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()

    return parent('Add directive', [
      action('Conditional', () => {
        TreeStore.addChild(parentNodeId, ConditionalElement.create())
      }),
      action('Switch', () => {
        ElementDialog.openCreate(
          parentNodeId,
          SwitchElement.createSchema(),
        )
      }),
      action('Loop', () => {
        ElementDialog.openCreate(
          parentNodeId,
          LoopElement.createSchema(),
        )
      }),
    ])
  }

  export const createAddBlockItem = (
    parentNodeId: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()

    return action('Add Block', () => {
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
        ? [action('Remove Retention', () => {
            TreeStore.transformNode(node.id, ContentHost.removeRetention)
          })]
        : []
    }

    return [
      createAddMenu(node.id, rootNode),
      createAddDirectiveMenu(node.id),
      createAddBlockItem(node.id),
      action('Use Retention', () => {
        TreeStore.transformNode(node.id, ContentHost.useRetention)
      }),
    ]
  }
}

export default ContentActions
