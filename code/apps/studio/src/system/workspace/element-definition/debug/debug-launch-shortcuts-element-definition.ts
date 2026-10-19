import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import DebugLaunchShortcuts from '@system/model/debug/debug-launch-shortcuts'

namespace DebugLaunchShortcutsElementDefinition {
  const parseBindings = (
    source: string,
    apps: readonly DebugLaunchShortcuts.App[],
  ): DebugLaunchShortcuts.Binding[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      const bindings = Array.isArray(parsed)
        ? parsed.flatMap((entry): DebugLaunchShortcuts.Binding[] => (
        typeof entry === 'object'
        && entry != null
        && typeof (entry as { appId?: unknown }).appId === 'string'
        && typeof (entry as { launcherId?: unknown }).launcherId === 'string'
          ? [{
              appId: (entry as { appId: string }).appId,
              launcherId: (entry as { launcherId: string }).launcherId,
            }]
          : []
          ))
        : []
      return DebugLaunchShortcuts.normalizeBindings(bindings, apps)
    } catch {
      return []
    }
  }

  export const createSchema = (
    apps: readonly DebugLaunchShortcuts.App[],
  ): ElementEditSchema.Schema<DebugLaunchShortcuts.Element> => ({
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
      bindings: JSON.stringify(DebugLaunchShortcuts.normalizeBindings(element.bindings, apps)),
    }),
    create: (values) => DebugLaunchShortcuts.create(parseBindings(values.bindings, apps)),
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
        createSchema(DebugLaunchShortcuts.collectApps(context.rootNode)),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<DebugLaunchShortcuts.Element>
}

export default DebugLaunchShortcutsElementDefinition
