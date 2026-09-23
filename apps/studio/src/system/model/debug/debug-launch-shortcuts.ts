import type TreeNode from '@system/model/tree/tree-node'

namespace DebugLaunchShortcuts {
  export type Kind = 'debug-launch-shortcuts'

  export type Binding = {
    appId: string
    launcherId: string
  }

  export type LauncherOption = {
    value: string
    label: string
    detail?: string
  }

  export type App = {
    appId: string
    label: string
    hasLaunchArguments: boolean
    launchers: readonly LauncherOption[]
  }

  export type Element = {
    kind: Kind
    bindings: Binding[]
  }

  export const create = (bindings: Binding[] = []): Element => ({
    kind: 'debug-launch-shortcuts',
    bindings,
  })

  export const collectApps = (
    rootNode: TreeNode.Node,
    excludedNodeIds: ReadonlySet<number> = new Set(),
  ): App[] => {
    const apps: App[] = []
    const launchers: {
      launcherId: string
      appId: string | null
      label: string
      detail?: string
    }[] = []
    const visit = (node: TreeNode.Node) => {
      if (excludedNodeIds.has(node.id)) return
      if (node.element.kind === 'app') {
        const argumentsNode = node.children
          .find((child) => child.element.kind === 'launch-options')
          ?.children.find((child) => child.element.kind === 'launch-arguments')
        apps.push({
          appId: node.element.appId,
          label: node.element.id,
          hasLaunchArguments: argumentsNode?.children.some(
            (child) => child.element.kind === 'launch-argument'
              && !excludedNodeIds.has(child.id),
          ) ?? false,
          launchers: [],
        })
      } else if (node.element.kind === 'launcher') {
        launchers.push({
          launcherId: node.element.launcherId,
          appId: node.element.appId,
          label: node.element.name?.trim() || node.element.id,
          detail: node.element.name?.trim() ? node.element.id : undefined,
        })
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return apps.map((app) => ({
      ...app,
      launchers: app.hasLaunchArguments
        ? launchers
            .filter((launcher) => launcher.appId === app.appId)
            .map((launcher) => ({
              value: launcher.launcherId,
              label: launcher.label,
              detail: launcher.detail,
            }))
        : [],
    }))
  }

  export const normalizeBindings = (
    bindings: readonly Binding[],
    apps: readonly App[],
  ): Binding[] => {
    const launcherByAppId = new Map<string, string>()
    bindings.forEach((binding) => {
      if (!launcherByAppId.has(binding.appId)) {
        launcherByAppId.set(binding.appId, binding.launcherId)
      }
    })
    return apps.flatMap((app): Binding[] => {
      if (!app.hasLaunchArguments) return []
      const launcherId = launcherByAppId.get(app.appId)
      return launcherId != null
        && app.launchers.some((launcher) => launcher.value === launcherId)
        ? [{ appId: app.appId, launcherId }]
        : []
    })
  }
}

export default DebugLaunchShortcuts
