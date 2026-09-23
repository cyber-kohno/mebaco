import type TreeNode from '@system/model/tree/tree-node'
import type Constant from './constant'

namespace ConstantScope {
  export type Entry = {
    node: TreeNode.Node & { element: Constant.Element }
    element: Constant.Element
  }

  const getEntries = (owner: TreeNode.Node | undefined): Entry[] => {
    const manager = owner?.children
      .find((child) => child.element.kind === 'declares')
      ?.children.find((child) => child.element.kind === 'constants')
    return manager?.children
      .filter((node): node is TreeNode.Node & { element: Constant.Element } => (
        node.element.kind === 'constant'
      ))
      .map((node) => ({ node, element: node.element }))
      ?? []
  }

  const getVisibleOwnerEntries = (
    owner: TreeNode.Node | undefined,
    targetNodeId: number,
  ): Entry[] => {
    const entries = getEntries(owner)
    const targetIndex = entries.findIndex((entry) => entry.node.id === targetNodeId)
    return targetIndex < 0 ? entries : entries.slice(0, targetIndex)
  }

  export const collectVisible = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): Entry[] => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const common = rootNode.children.find((node) => node.element.kind === 'common')
    const ownerCommon = [...path].reverse().find((node) => node.element.kind === 'common')
    const ownerApp = [...path].reverse().find((node) => node.element.kind === 'app')

    if (ownerCommon != null || ownerApp == null) {
      return getVisibleOwnerEntries(ownerCommon ?? common, targetNodeId)
    }
    return [
      ...getVisibleOwnerEntries(common, targetNodeId),
      ...getVisibleOwnerEntries(ownerApp, targetNodeId),
    ]
  }

  export const resolve = (
    rootNode: TreeNode.Node,
    sourceNodeId: number,
    id: string,
  ): Entry | null => collectVisible(rootNode, sourceNodeId)
    .find((entry) => entry.element.id === id) ?? null

  export const getReservedNames = (
    rootNode: TreeNode.Node,
    managerNodeId: number,
    excludeNodeId?: number,
  ): string[] => {
    const path = findPath(rootNode, managerNodeId) ?? []
    const ownerCommon = [...path].reverse().find((node) => node.element.kind === 'common')
    const ownerApp = [...path].reverse().find((node) => node.element.kind === 'app')
    const common = rootNode.children.find((node) => node.element.kind === 'common')
    const owners = ownerCommon != null
      ? [common, ...rootNode.children
          .find((node) => node.element.kind === 'apps')
          ?.children.filter((node) => node.element.kind === 'app') ?? []]
      : [common, ownerApp]

    return [...new Set(owners.flatMap((owner) => getEntries(owner))
      .filter((entry) => entry.node.id !== excludeNodeId)
      .map((entry) => entry.element.id))]
  }
}

export default ConstantScope
  const findPath = (
    node: TreeNode.Node,
    targetNodeId: number,
    path: TreeNode.Node[] = [],
  ): TreeNode.Node[] | null => {
    const nextPath = [...path, node]
    if (node.id === targetNodeId) return nextPath
    for (const child of node.children) {
      const found = findPath(child, targetNodeId, nextPath)
      if (found != null) return found
    }
    return null
  }
