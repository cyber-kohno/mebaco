import type AppElement from '../../element/kind/app/app-element'
import type TreeNode from '../../tree/tree-node'
import RuntimeSessionStore from '../runtime-session-store'
import RuntimeTree from '../runtime-tree'
import ToastController from '../../feedback/toast/toast-controller'
import ResourceRuntime from '../resource/resource-runtime'
import { get } from 'svelte/store'
import RuntimeLog from '../log/runtime-log'

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

  const findApp = (
    node: TreeNode.Node,
    appDefinitionId: string,
  ): TreeNode.Node | null => {
    if (node.element.kind === 'app' && node.element.appId === appDefinitionId) return node
    for (const child of node.children) {
      const found = findApp(child, appDefinitionId)
      if (found != null) return found
    }
    return null
  }

  const openApp = (
    rootNode: TreeNode.Node,
    appNode: TreeNode.Node,
    launcherId?: string,
    launchValues?: Readonly<Record<string, unknown>>,
    resourceSession?: ResourceRuntime.Session,
    logSession?: RuntimeLog.Session,
  ): boolean => {
    if (appNode.element.kind !== 'app') return false

    const runtime = RuntimeTree.createAppRuntime(appNode, rootNode)
    if (RuntimeTree.getEntryConfigurationError(runtime) != null) return false
    const effectiveResourceSession = resourceSession ?? ResourceRuntime.create(rootNode)
    const effectiveLogSession = logSession ?? RuntimeLog.create(rootNode)

    RuntimeSessionStore.open({
      app: appNode.element as AppElement.Element,
      appNode,
      projectNode: rootNode,
      resourceSession: effectiveResourceSession,
      logSession: effectiveLogSession,
      launcherId,
      launchValues,
    })
    return true
  }

  export const openForSelectedNode = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
    launcherId?: string,
    launchValues?: Readonly<Record<string, unknown>>,
  ): boolean => {
    const appNode = findOwnerApp(rootNode, selectedNodeId)
    if (appNode?.element.kind !== 'app') return false
    return openApp(rootNode, appNode, launcherId, launchValues)
  }

  export const transition = (
    rootNode: TreeNode.Node,
    appDefinitionId: string,
    launchValues: Readonly<Record<string, unknown>>,
  ): boolean => {
    const appNode = findApp(rootNode, appDefinitionId)
    if (appNode == null) {
      ToastController.show('Transition target App was not found.', { tone: 'danger' })
      return false
    }
    const currentSession = get(RuntimeSessionStore.store)
    const resourceSession = currentSession?.resourceSession ?? ResourceRuntime.create(rootNode)
    const logSession = currentSession?.logSession ?? RuntimeLog.create(rootNode)
    return openApp(
      rootNode,
      appNode,
      undefined,
      launchValues,
      resourceSession,
      logSession,
    )
  }

  export const close = () => {
    RuntimeSessionStore.close()
  }
}

export default PreviewController
