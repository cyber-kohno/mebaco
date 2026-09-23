import { ToastController } from '@system/ui/feedback/toast'
import PreviewController from '@system/runtime/preview/preview-controller'
import type TreeNode from '@system/model/tree/tree-node'
import DebugLaunchShortcuts from '@system/model/debug/debug-launch-shortcuts'

namespace DebugLaunchShortcutController {
  const findNode = (node: TreeNode.Node, nodeId: number): TreeNode.Node | null => {
    if (node.id === nodeId) return node
    for (const child of node.children) {
      const found = findNode(child, nodeId)
      if (found != null) return found
    }
    return null
  }

  const findShortcutElement = (
    node: TreeNode.Node,
  ): DebugLaunchShortcuts.Element | null => {
    if (node.element.kind === 'debug-launch-shortcuts') return node.element
    for (const child of node.children) {
      const found = findShortcutElement(child)
      if (found != null) return found
    }
    return null
  }

  export const launch = (rootNode: TreeNode.Node, appNodeId: number): boolean => {
    const appNode = findNode(rootNode, appNodeId)
    if (appNode?.element.kind !== 'app') return false
    const appElement = appNode.element
    const app = DebugLaunchShortcuts.collectApps(rootNode)
      .find((candidate) => candidate.appId === appElement.appId)
    if (app == null) return false

    let launcherId: string | undefined
    if (app.hasLaunchArguments) {
      const binding = findShortcutElement(rootNode)?.bindings
        .find((candidate) => candidate.appId === app.appId)
      if (binding == null || !app.launchers.some((item) => item.value === binding.launcherId)) {
        ToastController.show(
          `No launch shortcut is configured for '${appElement.id}'. Configure one under Debug > Launch Shortcuts.`,
          { tone: 'warning' },
        )
        return false
      }
      launcherId = binding.launcherId
    }

    const opened = PreviewController.openForSelectedNode(rootNode, appNode.id, launcherId)
    if (!opened) {
      ToastController.show(
        `'${appElement.id}' could not be started. Check its Entry and Launcher configuration.`,
        { tone: 'danger' },
      )
    }
    return opened
  }
}

export default DebugLaunchShortcutController
