import type ActionMenuState from '../action-menu/action-menu-state'
import DisabledActionMenu from '../element/disabled-action-menu'
import ElementRegistry from '../element/element-registry'
import TreeStore from '../store/tree-store'
import ExpressionVerificationActions from '../validation/expression/expression-verification-actions'
import type TreeNode from './tree-node'
import TreeTransferController from './transfer/tree-transfer-controller'

namespace TreeContextMenuResolver {
  export const resolve = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    parentNode: TreeNode.Node | null,
  ): ActionMenuState.Item[] => {
    const transferItems = TreeTransferController.getTransferMenu(rootNode, node)
    if (transferItems != null) return transferItems

    const definition = ElementRegistry.get(node.element.kind)
    const elementItems = definition.getContextMenu({
      element: node.element,
      node,
      parentNode,
      rootNode,
    })
    const withVerification = ExpressionVerificationActions.add(
      elementItems,
      rootNode,
      node,
    )
    const withDisabled = definition.canDisable
      ? DisabledActionMenu.add(withVerification, node.disabled === true, () => {
          TreeStore.toggleDisabled(node.id)
        })
      : withVerification
    return TreeTransferController.addCopyAction(withDisabled, node)
  }
}

export default TreeContextMenuResolver
