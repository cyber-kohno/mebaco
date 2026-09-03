import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ComponentsElement from '../declare/components-element'
import DeclaresElement from '../declare/declares-element'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import EntryElement from './entry-element'
import FunctionsElement from '../declare/functions-element'
import StatesElement from '../variable/store/states-element'
import StoreElement from '../variable/store/store-element'
import TypesElement from '../declare/types-element'
import StylesElement from '../declare/styles-element'
import AppTreeLabel from './AppTreeLabel.svelte'
import LaunchOptionsElement from './launch/launch-options-element'
import ImportsElement from './import/imports-element'
import TreeStore from '../../../store/tree-store'

namespace AppElement {
  export type Kind = 'app'

  export type Element = {
    kind: Kind
    appId: string
    id: string
  }

  export const create = (
    id: string,
    appId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'app',
    appId,
    id,
  })

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    afterCreate?: (element: Element, nodeId: number) => void | Promise<void>
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create App',
    updateTitle: 'Update App',
    fields: [
      {
        type: 'text',
        key: 'id',
        label: 'Id',
        width: 'id',
        required: true,
        charset: 'strictKebabIdentifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({
      id: element.id,
    }),
    create: (values) => create(values.id),
    afterCreate: options.afterCreate,
    update: (element, values) => ({
      ...element,
      id: values.id,
    }),
  })

  export const definition = {
    kind: 'app',
    treeLabel: {
      type: 'component',
      Component: AppTreeLabel,
    },
    getHierarchyText: ({ element }) => element.id,
    search: { getIdText: (element) => element.id },
    createInitialChildren: () => [
      { element: LaunchOptionsElement.create() },
      { element: ImportsElement.create() },
      {
        element: StoreElement.create(),
        children: [
          {
            element: StatesElement.create(),
          },
        ],
      },
      {
        element: DeclaresElement.create(),
        children: [
          {
            element: StylesElement.create(),
          },
          {
            element: TypesElement.create(),
          },
          {
            element: FunctionsElement.create(),
          },
          {
            element: ComponentsElement.create(),
          },
        ],
      },
      {
        element: EntryElement.create(),
      },
    ],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Element => element.kind === 'app')
        .map((element) => element.id)

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames }),
          )
        }),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default AppElement
