import TreeNode from '../tree/tree-node'
import ContentHost from './content-host'
import TagCatalog from './kind/view/tag/tag-catalog'

namespace ContentPlacement {
  const isUnder = (
    rootNode: TreeNode.Node,
    nodeId: number,
    kind: TreeNode.Node['element']['kind'],
  ): boolean => TreeNode.findPath(rootNode, nodeId)?.some(
    (node) => node.element.kind === kind,
  ) === true

  const isViewBranch = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): boolean => {
    const parentKind = TreeNode.findParent(rootNode, node.id)?.element.kind
    switch (node.element.kind) {
      case 'if':
      case 'else-if':
      case 'else':
        return parentKind === 'conditional'
      case 'case':
      case 'default':
        return parentKind === 'switch'
      case 'loop':
        return true
      default:
        return false
    }
  }

  export const canAcceptViewChild = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): boolean => {
    switch (node.element.kind) {
      case 'elements':
      case 'slot-use':
        return true
      case 'tag':
        return TagCatalog.canHaveChildren(node.element.tagName)
          && ContentHost.canUseRetention(node)
      case 'slot-content':
        return ContentHost.canUseRetention(node)
      case 'if':
      case 'else-if':
      case 'else':
      case 'case':
      case 'default':
      case 'loop':
        return isViewBranch(rootNode, node) && ContentHost.canUseRetention(node)
      case 'block':
        return !isUnder(rootNode, node.id, 'retention')
          && !isUnder(rootNode, node.id, 'function-procedure')
      default:
        return false
    }
  }
}

export default ContentPlacement
