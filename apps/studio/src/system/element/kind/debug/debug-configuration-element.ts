import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import DebugConfigurationTreeLabel from './DebugConfigurationTreeLabel.svelte'
import DebugResourceBindingsElement from './debug-resource-bindings-element'

namespace DebugConfigurationElement {
  export type Kind = 'debug-configuration'

  export type DefaultElement = {
    kind: Kind
    configurationId: string
    role: 'default'
  }

  export type CustomElement = {
    kind: Kind
    configurationId: string
    role: 'custom'
    name: string
  }

  export type Element = DefaultElement | CustomElement

  export const createDefault = (
    configurationId: string = crypto.randomUUID(),
  ): DefaultElement => ({
    kind: 'debug-configuration',
    configurationId,
    role: 'default',
  })

  export const createCustom = (
    name: string,
    configurationId: string = crypto.randomUUID(),
  ): CustomElement => ({
    kind: 'debug-configuration',
    configurationId,
    role: 'custom',
    name,
  })

  export const createCustomSchema = (
    options: { reservedNames?: readonly string[] } = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Configuration',
    updateTitle: 'Update Configuration',
    fields: [
      {
        type: 'text',
        key: 'name',
        label: 'Name',
        width: 'id',
        required: true,
        minLength: 1,
        maxLength: 64,
        reservedNames: options.reservedNames,
      },
    ],
    createPreview: () => createCustom('...'),
    getInitialValues: (element) => ({
      name: element.role === 'custom' ? element.name : '',
    }),
    create: (values) => createCustom(values.name),
    update: (element, values) => element.role === 'default'
      ? element
      : { ...element, name: values.name },
  })

  export const definition = {
    kind: 'debug-configuration',
    treeLabel: {
      type: 'component',
      Component: DebugConfigurationTreeLabel,
    },
    createInitialChildren: () => [
      { element: DebugResourceBindingsElement.create() },
    ],
    getContextMenu: (context) => {
      if (context.element.role === 'default') return []

      const { action } = ActionMenuState.createFactory()
      const reservedNames = [
        'Default',
        ...(context.parentNode?.children.flatMap((child) => (
          child.id !== context.node.id
          && child.element.kind === 'debug-configuration'
          && child.element.role === 'custom'
            ? [child.element.name]
            : []
        )) ?? []),
      ]
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createCustomSchema({ reservedNames }),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default DebugConfigurationElement
