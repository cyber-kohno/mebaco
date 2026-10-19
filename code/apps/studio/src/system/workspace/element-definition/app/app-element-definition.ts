import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import Components from '@system/model/declaration/components'
import Declares from '@system/model/declaration/declares'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import Entry from '@system/model/app/entry'
import Functions from '@system/model/declaration/functions'
import States from '@system/model/variable/states'
import Store from '@system/model/variable/store'
import Effects from '@system/model/variable/effects'
import Types from '@system/model/declaration/types'
import Styles from '@system/model/declaration/styles'
import Constants from '@system/model/declaration/constants'
import AppTreeLabel from '@system/workspace/tree/label/app/AppTreeLabel.svelte'
import LaunchOptions from '@system/model/app/launch-options'
import Imports from '@system/model/app/import/imports'
import TreeStore from '@system/workspace/tree/state'
import App from '@system/model/app/app'

namespace AppElementDefinition {
  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    afterCreate?: (element: App.Element, nodeId: number) => void | Promise<void>
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<App.Element> => ({
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
    createPreview: () => App.create('...'),
    getInitialValues: (element) => ({
      id: element.id,
    }),
    create: (values) => App.create(values.id),
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
      { element: LaunchOptions.create() },
      { element: Imports.create() },
      {
        element: Store.create(),
        children: [
          {
            element: States.create(),
          },
          {
            element: Effects.create(),
          },
        ],
      },
      {
        element: Declares.create(),
        children: [
          {
            element: Constants.create(),
          },
          {
            element: Styles.create(),
          },
          {
            element: Types.create(),
          },
          {
            element: Functions.create(),
          },
          {
            element: Components.create(),
          },
        ],
      },
      {
        element: Entry.create(),
      },
    ],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is App.Element => element.kind === 'app')
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
  } satisfies ElementDefinition.Definition<App.Element>
}

export default AppElementDefinition
