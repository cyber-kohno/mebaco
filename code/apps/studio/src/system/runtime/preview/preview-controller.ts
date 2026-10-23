import type App from '@system/model/app/app'
import type TreeNode from '@system/model/tree/tree-node'
import RuntimeSessionStore from '../runtime-session-store'
import RuntimeTree from '../runtime-tree'
import { ToastController } from '@system/ui/feedback/toast'
import ResourceRuntime from '../resource/resource-runtime'
import { get } from 'svelte/store'
import RuntimeLog from '../log/runtime-log'
import StorageRuntime from '../storage/storage-runtime'
import type RuntimePreviewProbe from './runtime-preview-probe'

namespace PreviewController {
  export type OpenOptions = {
    projectNode: TreeNode.Node
    appDefinitionId: string
    launcherId?: string
    launchValues?: Readonly<Record<string, unknown>>
    resourcePaths?: Readonly<Record<string, string>>
    resourceSession?: ResourceRuntime.Session
    storageScope?: StorageRuntime.Scope
    storageSession?: StorageRuntime.Session
    logSession?: RuntimeLog.Session
    inspection?: RuntimePreviewProbe.Session
    presentation?: RuntimeSessionStore.Presentation
    // Internal multi-session entry point. Existing launch UIs retain replacement behavior.
    retainExisting?: boolean
  }

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
    storageSession?: StorageRuntime.Session,
    inspection?: RuntimePreviewProbe.Session,
    presentation?: RuntimeSessionStore.Presentation,
    sessionId?: string,
    retainExisting = false,
  ): boolean => {
    if (appNode.element.kind !== 'app') return false

    const runtime = RuntimeTree.createAppRuntime(appNode, rootNode)
    if (RuntimeTree.getEntryConfigurationError(runtime) != null) return false
    const effectiveResourceSession = resourceSession ?? ResourceRuntime.create(rootNode)
    const effectiveLogSession = logSession ?? RuntimeLog.create(rootNode)
    const effectiveStorageSession = storageSession ?? new StorageRuntime.Session(
      rootNode,
      StorageRuntime.developmentScope(rootNode),
    )

    const session: RuntimeSessionStore.Input = {
      app: appNode.element as App.Element,
      appNode,
      projectNode: rootNode,
      resourceSession: effectiveResourceSession,
      logSession: effectiveLogSession,
      storageSession: effectiveStorageSession,
      launcherId,
      launchValues,
      inspection,
      presentation,
    }
    if (sessionId != null) return RuntimeSessionStore.replace(sessionId, session)
    if (retainExisting) RuntimeSessionStore.create(session)
    else RuntimeSessionStore.open(session)
    return true
  }

  export const open = (
    options: OpenOptions,
  ): boolean => {
    const appNode = findApp(options.projectNode, options.appDefinitionId)
    if (appNode?.element.kind !== 'app') return false
    const resourceSession = options.resourceSession ?? (options.resourcePaths == null
      ? ResourceRuntime.create(options.projectNode)
      : ResourceRuntime.createWithPaths(options.projectNode, options.resourcePaths))
    const opened = openApp(
      options.projectNode,
      appNode,
      options.launcherId,
      options.launchValues,
      resourceSession,
      options.logSession,
      options.storageSession ?? new StorageRuntime.Session(
        options.projectNode,
        options.storageScope ?? StorageRuntime.developmentScope(options.projectNode),
      ),
      options.inspection,
      options.presentation,
      undefined,
      options.retainExisting,
    )
    if (!opened) resourceSession.dispose()
    return opened
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
    sessionId?: string,
  ): boolean => {
    const currentSession = sessionId == null
      ? get(RuntimeSessionStore.store)
      : RuntimeSessionStore.find(sessionId)
    // Ignore delayed transitions from a runtime that has already been closed.
    if (currentSession == null || currentSession.projectNode !== rootNode) return false
    const appNode = findApp(rootNode, appDefinitionId)
    if (appNode == null) {
      ToastController.show('Transition target App was not found.', { tone: 'danger' })
      return false
    }
    return openApp(
      rootNode,
      appNode,
      undefined,
      launchValues,
      currentSession.resourceSession,
      currentSession.logSession,
      currentSession.storageSession,
      currentSession.inspection,
      currentSession.presentation,
      currentSession.id,
    )
  }

  export const close = (sessionId?: string) => {
    RuntimeSessionStore.close(sessionId)
  }
}

export default PreviewController
