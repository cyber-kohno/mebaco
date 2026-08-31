import type ActionMenuState from '../../action-menu/action-menu-state'
import type TreeNode from '../../tree/tree-node'
import ExpressionSourceCatalog from './expression-source-catalog'
import ExpressionVerificationStore from './expression-verification-store'
import ExpressionVerificationRunner from './expression-verification-runner'

namespace ExpressionVerificationActions {
  /** Add the common, element-level expression verification action when applicable. */
  export const add = (
    items: ActionMenuState.Item[],
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): ActionMenuState.Item[] => {
    if (!ExpressionSourceCatalog.isVerificationCandidate(rootNode, node)) {
      return items
    }

    const verify = async () => {
      const result = await ExpressionVerificationRunner.verify(rootNode, node)
      if (result != null) ExpressionVerificationStore.setResult(node, result)
    }

    const nextItems = [...items]
    const deleteIndex = nextItems.findIndex((item) => (
      item.type === 'action' && item.label === 'Delete'
    ))
    nextItems.splice(
      deleteIndex >= 0 ? deleteIndex : nextItems.length,
      0,
      { type: 'action', label: 'Verify', callback: verify },
    )
    return nextItems
  }
}

export default ExpressionVerificationActions
