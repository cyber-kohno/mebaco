import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import type TreeNode from '../../../tree/tree-node'

namespace DebugLaunchShortcutsElement {
  export type Kind = 'debug-launch-shortcuts'

  export type Binding = {
    appId: string
    launcherId: string
  }

  export type App = {
    appId: string
    label: string
    hasLaunchArguments: boolean
    launchers: readonly ElementEditSchema.SelectOption[]
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
    const launchers: { launcherId: string; appId: string | null; label: string; detail?: string }[] = []
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
            (child) => child.element.kind === 'launch-argument' && !excludedNodeIds.has(child.id),
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
        ? launchers.filter((launcher) => launcher.appId === app.appId).map((launcher) => ({
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
      if (!launcherByAppId.has(binding.appId)) launcherByAppId.set(binding.appId, binding.launcherId)
    })
    return apps.flatMap((app): Binding[] => {
      if (!app.hasLaunchArguments) return []
      const launcherId = launcherByAppId.get(app.appId)
      return launcherId != null && app.launchers.some((launcher) => launcher.value === launcherId)
        ? [{ appId: app.appId, launcherId }]
        : []
    })
  }

  const parseBindings = (source: string, apps: readonly App[]): Binding[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      const bindings = Array.isArray(parsed) ? parsed.flatMap((entry): Binding[] => (
        typeof entry === 'object'
        && entry != null
        && typeof (entry as { appId?: unknown }).appId === 'string'
        && typeof (entry as { launcherId?: unknown }).launcherId === 'string'
          ? [{
              appId: (entry as { appId: string }).appId,
              launcherId: (entry as { launcherId: string }).launcherId,
            }]
          : []
      )) : []
      return normalizeBindings(bindings, apps)
    } catch {
      return []
    }
  }

  export const createSchema = (
    apps: readonly App[],
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Launch Shortcuts',
    updateTitle: 'Update Launch Shortcuts',
    fields: [{
      type: 'debugLaunchShortcuts',
      key: 'bindings',
      label: 'Apps',
      defaultValue: '[]',
      apps,
    }],
    getInitialValues: (element) => ({
      bindings: JSON.stringify(normalizeBindings(element.bindings, apps)),
    }),
    create: (values) => create(parseBindings(values.bindings, apps)),
    update: (element, values) => ({
      ...element,
      bindings: parseBindings(values.bindings, apps),
    }),
  })

  export const definition = {
    kind: 'debug-launch-shortcuts',
    treeLabel: { type: 'static', kindText: 'Launch shortcuts', tone: 'manager' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [action('Modify', () => ElementDialog.openUpdate(
        context.node.id,
        context.element,
        createSchema(collectApps(context.rootNode)),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default DebugLaunchShortcutsElement
