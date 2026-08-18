import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ComponentElement from '../component/definition/component-element'
import ElementDialog from '../../../element-dialog/element-dialog-controller'

namespace ComponentsElement {
  export type Kind = 'components'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'components',
  })

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
        .filter((element): element is ComponentElement.Element => element.kind === 'component')
        .map((element) => element.id)

      return [
        action('Add Component', () => {
          ElementDialog.openCreate(
            context.node.id,
            ComponentElement.createSchema({ reservedNames }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ComponentsElement
