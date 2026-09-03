import type ElementDefinition from '../../../../element-definition'
import type ElementEditSchema from '../../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../../../store/tree-store'
import PropsElement from '../props-element'
import SlotTreeLabel from './SlotTreeLabel.svelte'

namespace SlotElement {
  export type Kind = 'slot'

  export type Element = {
    kind: Kind
    slotId: string
    id: string
  }

  export const create = (
    id: string,
    slotId: string = crypto.randomUUID(),
  ): Element => ({ kind: 'slot', slotId, id })

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
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
    createPreview: () => create('...'),
    getInitialValues: (element) => ({ id: element.id }),
    create: (values) => create(values.id),
    update: (element, values) => ({ ...element, id: values.id }),
  })

  export const definition = {
    kind: 'slot',
    treeLabel: { type: 'component', Component: SlotTreeLabel },
    search: { getIdText: (element) => element.id },
    createInitialChildren: () => [{ element: PropsElement.create() }],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Element => element.kind === 'slot')
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
  } satisfies ElementDefinition.Definition<Element>
}

export default SlotElement
