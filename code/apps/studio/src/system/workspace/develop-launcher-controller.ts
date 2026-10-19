import { get } from 'svelte/store'
import type TreeNode from '@system/model/tree/tree-node'
import type Launcher from '@system/model/project/launcher'
import type App from '@system/model/app/app'
import RuntimeTree from '@system/runtime/runtime-tree'
import PreviewController from '@system/runtime/preview/preview-controller'
import RuntimeSessionStore from '@system/runtime/runtime-session-store'
import { ToastController } from '@system/ui/feedback/toast'
import { translate } from '@system/application/localization'

namespace DevelopLauncherController {
  export type Item = {
    nodeId: number
    launcher: Launcher.Element
    app: App.Element | null
    problem: 'appNotConfigured' | 'appMissing' | 'entryInvalid' | null
  }

  export const collect = (rootNode: TreeNode.Node): Item[] => {
    const appNodes: TreeNode.Node[] = []
    const launcherNodes: (TreeNode.Node & { element: Launcher.Element })[] = []
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'app') appNodes.push(node)
      if (node.element.kind === 'launcher') {
        launcherNodes.push(node as TreeNode.Node & { element: Launcher.Element })
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return launcherNodes.map((node): Item => {
      const appNode = appNodes.find((candidate) => (
        candidate.element.kind === 'app' && candidate.element.appId === node.element.appId
      ))
      const app = appNode?.element.kind === 'app' ? appNode.element : null
      return {
        nodeId: node.id,
        launcher: node.element,
        app,
        problem: node.element.appId == null
          ? 'appNotConfigured'
          : appNode == null
            ? 'appMissing'
            : RuntimeTree.getEntryConfigurationError(RuntimeTree.createAppRuntime(appNode, rootNode)) != null
              ? 'entryInvalid'
              : null,
      }
    })
  }

  export const open = (rootNode: TreeNode.Node, nodeId: number): boolean => {
    const item = collect(rootNode).find((candidate) => candidate.nodeId === nodeId)
    if (item?.app == null || item.problem != null || get(RuntimeSessionStore.store) != null) return false

    const opened = PreviewController.open({
      // Run the current editing state while retaining its development Storage scope.
      projectNode: structuredClone(rootNode),
      appDefinitionId: item.app.appId,
      launcherId: item.launcher.launcherId,
      presentation: {
        type: 'application',
        title: item.launcher.name?.trim() || item.launcher.id,
      },
    })
    if (!opened) {
      ToastController.show(translate('workspace.launchers.launchFailed'), { tone: 'danger' })
    }
    return opened
  }
}

export default DevelopLauncherController
