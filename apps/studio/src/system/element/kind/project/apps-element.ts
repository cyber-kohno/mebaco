import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import AppElement from '../app/app-element'

namespace AppsElement {
  export type Kind = 'apps'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'apps',
  })

  export const definition = {
    kind: 'apps',
    treeLabel: {
      type: 'static',
      kindText: 'Apps',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children
        .map((node) => node.element)
        .filter((element): element is AppElement.Element => element.kind === 'app')
        .map((element) => element.id)

      return [
        action('Add App', () => {
          ElementDialog.openCreate(context.node.id, AppElement.createSchema({ reservedNames }))
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default AppsElement
