import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import Slot from '@system/model/component/slot'
import Slots from '@system/model/component/slots'
import SlotElementDefinition from './slot-element-definition'

namespace SlotsElementDefinition {
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
        .filter((element): element is Slot.Element => element.kind === 'slot')
        .map((element) => element.id)

      return [
        action('Add slot', () => {
          ElementDialog.openCreate(
            context.node.id,
            SlotElementDefinition.createSchema({ reservedNames }),
          )
        }),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Slots.Element>
}

export default SlotsElementDefinition
