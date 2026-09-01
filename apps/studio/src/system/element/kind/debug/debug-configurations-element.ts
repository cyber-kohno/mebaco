import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import DebugConfigurationElement from './debug-configuration-element'

namespace DebugConfigurationsElement {
  export type Kind = 'debug-configurations'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'debug-configurations' })

  export const definition = {
    kind: 'debug-configurations',
    treeLabel: { type: 'static', kindText: 'Configurations', tone: 'folder' },
    createInitialChildren: () => [
      { element: DebugConfigurationElement.createDefault() },
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
          DebugConfigurationElement.createCustomSchema({ reservedNames }),
        )),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default DebugConfigurationsElement
