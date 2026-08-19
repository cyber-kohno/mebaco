import type AppElement from '../../element/kind/app/app-element'
import type TreeNode from '../../tree/tree-node'
import RuntimeSessionStore from '../runtime-session-store'
import RuntimeTree from '../runtime-tree'
import ToastController from '../../feedback/toast/toast-controller'

namespace PreviewController {
  const findOwnerApp = (
    node: TreeNode.Node,
    targetNodeId: number,
    ownerAppNode: TreeNode.Node | null = null,
  ): TreeNode.Node | null => {
    const currentOwnerAppNode = node.element.kind === 'app'
      ? node
      : ownerAppNode

    if (node.id === targetNodeId) return currentOwnerAppNode

    for (const child of node.children) {
      const found = findOwnerApp(child, targetNodeId, currentOwnerAppNode)
      if (found != null) return found
    }

    return null
  }

  export const openForSelectedNode = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
  ): boolean => {
    const appNode = findOwnerApp(rootNode, selectedNodeId)
    if (appNode?.element.kind !== 'app') return false

    const runtime = RuntimeTree.createAppRuntime(appNode, rootNode)
    if (runtime.entryNode == null) {
      ToastController.show('Entry is not configured for this App.', { tone: 'warning' })
      return false
    }
    if (runtime.entryNode.element.componentId == null) {
      ToastController.show('Entry component is not configured.', { tone: 'warning' })
      return false
    }
    if (RuntimeTree.getEntryComponentNode(runtime) == null) {
      ToastController.show('The configured Entry component was not found.', { tone: 'warning' })
      return false
    }

    RuntimeSessionStore.open({
      app: appNode.element as AppElement.Element,
      appNode,
      projectNode: rootNode,
    })
    return true
  }

  export const close = () => {
    RuntimeSessionStore.close()
  }
}

export default PreviewController
