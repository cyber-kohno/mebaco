import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import ResourceDefinition from './resource-definition'

namespace TextResourceElement {
  export type Kind = 'text-resource'
  export type Element = ResourceDefinition.Identity & {
    kind: Kind
    access: ResourceDefinition.Access
  }

  export const create = (
    id: string,
    resourceId?: string,
    access: ResourceDefinition.Access = 'read',
  ): Element => ({
    kind: 'text-resource',
    ...ResourceDefinition.createIdentity(id, resourceId),
    access,
  })

  export const createSchema = (
    options: { reservedNames?: readonly string[] } = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Text File Resource',
    updateTitle: 'Update Text File Resource',
    fields: [
      { type: 'text', key: 'id', label: 'Id', width: 'id', required: true, charset: 'jsIdentifier', minLength: 1, maxLength: 32, reservedNames: options.reservedNames },
      { type: 'select', key: 'access', label: 'Access', defaultValue: 'read', required: true, options: [{ value: 'read', label: 'Read' }, { value: 'read-write', label: 'Read / Write' }] },
    ],
    createPreview: () => create('...', 'preview'),
    getInitialValues: (element) => ({ id: element.id, access: element.access }),
    create: (values) => create(values.id, undefined, ResourceDefinition.parseAccess(values.access)),
    update: (element, values) => ({ ...element, id: values.id, access: ResourceDefinition.parseAccess(values.access) }),
  })

  export const definition = {
    kind: 'text-resource',
    treeLabel: { type: 'static', kindText: 'Text file', tone: 'master', getValueText: (element: Element) => element.id },
    search: { getIdText: (element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => (node.element as { id?: unknown }).id)
        .filter((id): id is string => typeof id === 'string')
      return [
        action('Modify', () => ElementDialog.openUpdate(context.node.id, context.element, createSchema({ reservedNames }))),
        action('Delete', () => import('../../../store/tree-store').then(({ default: store }) => store.removeNode(context.node.id)), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default TextResourceElement
