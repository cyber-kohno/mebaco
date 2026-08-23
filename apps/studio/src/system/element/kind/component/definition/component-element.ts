import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ComponentTreeLabel from './ComponentTreeLabel.svelte'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import ElementsElement from './elements-element'
import PropsElement from './props-element'
import RetentionElement from './retention-element'
import SlotsElement from './slot/slots-element'
import TreeStore from '../../../../store/tree-store'
import StoreElement from '../../variable/store/store-element'
import StatesElement from '../../variable/store/states-element'

namespace ComponentElement {
  export type Kind = 'component'

  export type Element = {
    kind: Kind
    id: string
    local?: boolean
  }

  export const create = (id: string): Element => ({
    kind: 'component',
    id,
  })

  export const createLocal = (id: string): Element => ({
    kind: 'component',
    id,
    local: true,
  })

  export const isLocal = (element: Element): boolean => element.local === true

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    local?: boolean
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: options.local === true ? 'Create Local Component' : 'Create Component',
    updateTitle: options.local === true ? 'Update Local Component' : 'Update Component',
    fields: [
      {
        type: 'text',
        key: 'id',
        label: 'Id',
        readOnlyOnUpdate: true,
        width: 'id',
        required: true,
        charset: 'pascalIdentifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
      },
    ],
    createPreview: () => (options.local === true ? createLocal('...') : create('...')),
    getInitialValues: (element) => ({
      id: element.id,
    }),
    create: (values) => (options.local === true ? createLocal(values.id) : create(values.id)),
    update: (element, values) => ({
      ...element,
      id: values.id,
    }),
  })

  export const definition = {
    kind: 'component',
    treeLabel: {
      type: 'component',
      Component: ComponentTreeLabel,
    },
    createInitialChildren: () => [
      {
        element: PropsElement.create(),
      },
      {
        element: StoreElement.create(),
        children: [
          {
            element: StatesElement.create(),
          },
        ],
      },
      {
        element: RetentionElement.create(),
      },
      {
        element: ElementsElement.create(),
      },
    ],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Element => element.kind === 'component')
        .map((element) => element.id)

      return [
        ...((context.node.children.some((node) => node.element.kind === 'slots'))
          ? []
          : [action('Use slots', () => {
              const propsIndex = context.node.children.findIndex((node) => node.element.kind === 'props')
              TreeStore.addChild(
                context.node.id,
                SlotsElement.create(),
                propsIndex < 0 ? undefined : propsIndex + 1,
              )
            })]),
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames, local: isLocal(context.element) }),
          )
        }),
      ]
    },
    contentHost: {
      retention: 'required',
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default ComponentElement
