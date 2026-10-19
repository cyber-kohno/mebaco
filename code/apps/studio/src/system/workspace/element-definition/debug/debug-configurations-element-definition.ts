import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import DebugConfigurations from '@system/model/debug/debug-configurations'
import DebugConfiguration from '@system/model/debug/debug-configuration'
import DebugConfigurationElementDefinition from './debug-configuration-element-definition'

namespace DebugConfigurationsElementDefinition {
  export const definition = {
    kind: 'debug-configurations',
    treeLabel: { type: 'static', kindText: 'Configurations', tone: 'folder' },
    createInitialChildren: () => [
      { element: DebugConfiguration.createDefault() },
    ],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = [
        'Default',
        ...context.node.children.flatMap((child) => (
          child.element.kind === 'debug-configuration'
          && child.element.role === 'custom'
            ? [child.element.name]
            : []
        )),
      ]
      return [
        action('Add configuration', () => ElementDialog.openCreate(
          context.node.id,
          DebugConfigurationElementDefinition.createCustomSchema({ reservedNames }),
        )),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<DebugConfigurations.Element>
}

export default DebugConfigurationsElementDefinition
