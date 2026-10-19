import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import DebugConfigurationTreeLabel from '@system/workspace/tree/label/debug/DebugConfigurationTreeLabel.svelte'
import DebugConfiguration from '@system/model/debug/debug-configuration'
import DebugResourceBindings from '@system/model/debug/debug-resource-bindings'

namespace DebugConfigurationElementDefinition {
  export const createCustomSchema = (
    options: { reservedNames?: readonly string[] } = {},
  ): ElementEditSchema.Schema<DebugConfiguration.Element> => ({
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
    createPreview: () => DebugConfiguration.createCustom('...'),
    getInitialValues: (element) => ({
      name: element.role === 'custom' ? element.name : '',
    }),
    create: (values) => DebugConfiguration.createCustom(values.name),
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
    search: {
      getIdText: (element) => element.role === 'default' ? 'default' : element.name,
    },
    createInitialChildren: () => [
      { element: DebugResourceBindings.create() },
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
  } satisfies ElementDefinition.Definition<DebugConfiguration.Element>
}

export default DebugConfigurationElementDefinition
