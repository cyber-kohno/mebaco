import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import Component from '@system/model/component/component'
import ComponentElementDefinition from '@system/workspace/element-definition/component/component-element-definition'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import Components from '@system/model/declaration/components'

namespace ComponentsElementDefinition {
  export const definition = {
    kind: 'components',
    treeLabel: {
      type: 'static',
      kindText: 'Components',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children
        .map((node) => node.element)
        .filter((element): element is Component.Element => element.kind === 'component')
        .map((element) => element.id)

      return [
        action('Add component', () => {
          ElementDialog.openCreate(
            context.node.id,
            ComponentElementDefinition.createSchema({ reservedNames }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Components.Element>
}

export default ComponentsElementDefinition
