import type ElementDefinition from '../../../../element-definition'
import ActionMenuState from '../../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../../element-dialog/element-dialog-controller'
import SlotElement from './slot-element'
import TreeStore from '../../../../../store/tree-store'

namespace SlotsElement {
  export type Kind = 'slots'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({ kind: 'slots' })

  export const definition = {
    kind: 'slots',
    treeLabel: {
      type: 'static',
      kindText: 'Slots',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children
        .map((node) => node.element)
        .filter((element): element is SlotElement.Element => element.kind === 'slot')
        .map((element) => element.id)

      return [
        action('Add Slot', () => {
          ElementDialog.openCreate(
            context.node.id,
            SlotElement.createSchema({ reservedNames }),
          )
        }),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default SlotsElement
