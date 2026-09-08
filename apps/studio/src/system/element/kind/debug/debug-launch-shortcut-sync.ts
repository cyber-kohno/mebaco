import type TreeNode from '../../../tree/tree-node'
import DebugLaunchShortcutsElement from './debug-launch-shortcuts-element'

namespace DebugLaunchShortcutSync {
  export const sync = (
    rootNode: TreeNode.Node,
    excludedNodeIds: ReadonlySet<number> = new Set(),
  ): number => {
    const apps = DebugLaunchShortcutsElement.collectApps(rootNode, excludedNodeIds)
    let correctedNodeCount = 0
    const visit = (node: TreeNode.Node) => {
      if (excludedNodeIds.has(node.id)) return
      if (node.element.kind === 'debug-launch-shortcuts') {
        const bindings = DebugLaunchShortcutsElement.normalizeBindings(node.element.bindings, apps)
        if (JSON.stringify(bindings) !== JSON.stringify(node.element.bindings)) {
          node.element = { ...node.element, bindings }
          correctedNodeCount += 1
        }
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return correctedNodeCount
  }
}

export default DebugLaunchShortcutSync
