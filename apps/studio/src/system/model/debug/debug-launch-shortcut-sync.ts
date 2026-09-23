import type TreeNode from '@system/model/tree/tree-node'
import DebugLaunchShortcuts from './debug-launch-shortcuts'

namespace DebugLaunchShortcutSync {
  export const sync = (
    rootNode: TreeNode.Node,
    excludedNodeIds: ReadonlySet<number> = new Set(),
  ): number => {
    const apps = DebugLaunchShortcuts.collectApps(rootNode, excludedNodeIds)
    let correctedNodeCount = 0
    const visit = (node: TreeNode.Node) => {
      if (excludedNodeIds.has(node.id)) return
      if (node.element.kind === 'debug-launch-shortcuts') {
        const bindings = DebugLaunchShortcuts.normalizeBindings(node.element.bindings, apps)
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
