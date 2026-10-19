import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import Props from '@system/model/component/props'
import Slot from '@system/model/component/slot'
import SlotTreeLabel from '@system/workspace/tree/label/component/SlotTreeLabel.svelte'

namespace SlotElementDefinition {
  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Slot.Element> => ({
    createTitle: 'Create Slot',
    updateTitle: 'Update Slot',
    fields: [{
      type: 'text',
      key: 'id',
      label: 'Id',
      width: 'id',
      required: true,
      charset: 'jsIdentifier',
      minLength: 1,
      maxLength: 32,
      reservedNames: options.reservedNames,
    }],
    createPreview: () => Slot.create('...'),
    getInitialValues: (element) => ({ id: element.id }),
    create: (values) => Slot.create(values.id),
    update: (element, values) => ({ ...element, id: values.id }),
  })

  export const definition = {
    kind: 'slot',
    treeLabel: { type: 'component', Component: SlotTreeLabel },
    search: { getIdText: (element) => element.id },
    createInitialChildren: () => [{ element: Props.create() }],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Slot.Element => element.kind === 'slot')
        .map((element) => element.id)

      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema({ reservedNames }),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Slot.Element>
}

export default SlotElementDefinition
