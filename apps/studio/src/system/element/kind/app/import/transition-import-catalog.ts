import type AppElement from '../app-element'
import type TreeNode from '../../../../tree/tree-node'
import type TransitionsElement from './transitions-element'

namespace TransitionImportCatalog {
  export type AppNode = TreeNode.Node & { element: AppElement.Element }

  const collectApps = (
    node: TreeNode.Node,
    result: AppNode[] = [],
  ): AppNode[] => {
    if (node.element.kind === 'app') result.push(node as AppNode)
    node.children.forEach((child) => collectApps(child, result))
    return result
  }

  export const findOwnerApp = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    owner: AppNode | null = null,
  ): AppNode | null => {
    const nextOwner = rootNode.element.kind === 'app' ? rootNode as AppNode : owner
    if (rootNode.id === targetNodeId) return nextOwner
    for (const child of rootNode.children) {
      const found = findOwnerApp(child, targetNodeId, nextOwner)
      if (found != null) return found
    }
    return null
  }

  export const getTransitionIds = (appNode: TreeNode.Node): readonly string[] => {
    const transitions = appNode.children
      .find((child) => child.element.kind === 'imports')
      ?.children.find((child) => child.element.kind === 'transitions')
      ?.element
    return transitions?.kind === 'transitions'
      ? (transitions as TransitionsElement.Element).appIds
      : []
  }

  export const getImportedApps = (
    rootNode: TreeNode.Node,
    appNode: TreeNode.Node,
  ): AppNode[] => {
    const appsById = new Map(collectApps(rootNode).map((node) => [node.element.appId, node]))
    return getTransitionIds(appNode)
      .map((appId) => appsById.get(appId) ?? null)
      .filter((node): node is AppNode => node != null && node.id !== appNode.id)
  }

  export const canTransition = (
    rootNode: TreeNode.Node,
    appNode: TreeNode.Node,
    targetAppId: string,
  ): boolean => getImportedApps(rootNode, appNode)
    .some((target) => target.element.appId === targetAppId)

  export const getAvailableApps = (
    rootNode: TreeNode.Node,
    ownerAppNode: TreeNode.Node,
  ): AppNode[] => collectApps(rootNode).filter((node) => node.id !== ownerAppNode.id)
}

export default TransitionImportCatalog
