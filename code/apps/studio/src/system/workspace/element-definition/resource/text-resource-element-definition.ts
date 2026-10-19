import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import ResourceDefinition from '@system/model/resource/resource-definition'
import TextResource from '@system/model/resource/text-resource'
import ResourceTreeLabel from '@system/workspace/tree/label/resource/ResourceTreeLabel.svelte'

namespace TextResourceElementDefinition {
  export const createSchema = (
    options: { reservedNames?: readonly string[] } = {},
  ): ElementEditSchema.Schema<TextResource.Element> => ({
    createTitle: 'Create Text File Resource',
    updateTitle: 'Update Text File Resource',
    fields: [
      { type: 'text', key: 'id', label: 'Id', width: 'id', required: true, charset: 'jsIdentifier', minLength: 1, maxLength: 32, reservedNames: options.reservedNames },
      { type: 'text', key: 'name', label: 'Name', width: 'id', maxLength: 64 },
      { type: 'select', key: 'access', label: 'Access', defaultValue: 'read', required: true, options: [{ value: 'read', label: 'Read' }, { value: 'read-write', label: 'Read / Write' }] },
    ],
    createPreview: () => TextResource.create('...', 'preview'),
    getInitialValues: (element) => ({ id: element.id, name: element.name ?? '', access: element.access }),
    create: (values) => ResourceDefinition.withOptionalName(
      TextResource.create(values.id, undefined, ResourceDefinition.parseAccess(values.access)), values.name,
    ),
    update: (element, values) => ResourceDefinition.withOptionalName(
      { ...element, id: values.id, access: ResourceDefinition.parseAccess(values.access) }, values.name,
    ),
  })

  export const definition = {
    kind: 'text-resource',
    treeLabel: { type: 'component', Component: ResourceTreeLabel },
    search: { getIdText: (element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => (node.element as { id?: unknown }).id)
        .filter((id): id is string => typeof id === 'string')
      return [
        action('Modify', () => ElementDialog.openUpdate(context.node.id, context.element, createSchema({ reservedNames }))),
        action('Delete', () => import('@system/workspace/tree/state').then(({ default: store }) => store.removeNode(context.node.id)), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<TextResource.Element>
}

export default TextResourceElementDefinition
