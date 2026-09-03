import type ActionMenuState from '../action-menu/action-menu-state'
import DisabledActionMenu from '../element/disabled-action-menu'
import ElementRegistry from '../element/element-registry'
import TreeStore from '../store/tree-store'
import ExpressionVerificationActions from '../validation/expression/expression-verification-actions'
import type TreeNode from './tree-node'
import TreeDestinationController from './destination/tree-destination-controller'

namespace TreeContextMenuResolver {
  export const resolve = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    parentNode: TreeNode.Node | null,
  ): ActionMenuState.Item[] => {
    const destinationItems = TreeDestinationController.getDestinationMenu(rootNode, node)
    if (destinationItems != null) return destinationItems

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
    const withExtraction = TreeDestinationController.addSignatureExtractionAction(
      withDisabled,
      node,
    )
    const withCopy = TreeDestinationController.addCopyAction(withExtraction, node)
    return TreeDestinationController.addMoveAction(withCopy, node)
  }
}

export default TreeContextMenuResolver
