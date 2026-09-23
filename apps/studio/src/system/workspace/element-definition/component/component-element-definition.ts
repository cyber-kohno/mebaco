import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ComponentTreeLabel from '@system/workspace/tree/label/component/ComponentTreeLabel.svelte'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import Component from '@system/model/component/component'
import Elements from '@system/model/component/elements'
import Props from '@system/model/component/props'
import Retention from '@system/model/component/retention'
import Slots from '@system/model/component/slots'
import TreeStore from '@system/workspace/tree/state'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'
import Store from '@system/model/variable/store'
import States from '@system/model/variable/states'
import ResolvableValue from '@system/model/value/resolvable-value'
import Effects from '@system/model/variable/effects'

namespace ComponentElementDefinition {
  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    local?: boolean
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Component.Element> => ({
    createTitle: options.local === true ? 'Create Local Component' : 'Create Component',
    updateTitle: options.local === true ? 'Update Local Component' : 'Update Component',
    fields: [
      {
        type: 'text',
        key: 'id',
        label: 'Id',
        width: 'id',
        required: true,
        charset: 'pascalIdentifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'tagPartialKey',
        key: 'partialKey',
        label: 'Root Partial',
        defaultValue: '',
      },
    ],
    createPreview: () => (
      options.local === true ? Component.createLocal('...') : Component.create('...')
    ),
    getInitialValues: (element) => ({
      id: element.id,
      partialKey: element.partialKey == null ? '' : ResolvableValue.stringify(element.partialKey),
    }),
    create: (values) => {
      const element = options.local === true
        ? Component.createLocal(values.id)
        : Component.create(values.id)
      const partialKey = Component.parsePartialKey(values.partialKey ?? '')
      return { ...element, ...(partialKey == null ? {} : { partialKey }) }
    },
    update: (element, values) => {
      const { partialKey: _currentPartialKey, ...base } = element
      const partialKey = Component.parsePartialKey(values.partialKey ?? '')
      return {
        ...base,
        id: values.id,
        ...(partialKey == null ? {} : { partialKey }),
      }
    },
  })

  export const definition = {
    kind: 'component',
    treeLabel: {
      type: 'component',
      Component: ComponentTreeLabel,
    },
    getHierarchyText: ({ element }) => element.id,
    search: { getIdText: (element) => element.id },
    createInitialChildren: () => [
      {
        element: Props.create(),
      },
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
        element: Retention.create(),
      },
      {
        element: Elements.create(),
      },
    ],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Component.Element => element.kind === 'component')
        .map((element) => element.id)

      const slotsNode = context.node.children.find((node) => node.element.kind === 'slots')
      const slotsAction = slotsNode == null
        ? action('Use slots', () => {
            const propsIndex = context.node.children.findIndex((node) => node.element.kind === 'props')
            TreeStore.addChild(
              context.node.id,
              Slots.create(),
              propsIndex < 0 ? undefined : propsIndex + 1,
            )
          })
        : action('Remove slots', () => {
            TreeStore.removeNode(slotsNode.id)
          })

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames, local: Component.isLocal(context.element) }),
          )
        }),
        slotsAction,
        action('Delete', () => {
          void ElementDeletionController.requestDelete({
            rootNode: context.rootNode,
            node: context.node,
            policy: {
              label: 'Component',
              structuralReferences: 'block',
            },
            deleteNode: () => TreeStore.removeNode(context.node.id),
          })
        }, 'danger'),
      ]
    },
    contentHost: {
      retention: 'required',
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Component.Element>
}

export default ComponentElementDefinition
