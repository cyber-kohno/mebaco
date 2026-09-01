import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import ResourceDefinition from './resource-definition'

namespace SqliteResourceElement {
  export type Kind = 'sqlite-resource'
  export type Element = ResourceDefinition.Identity & {
    kind: Kind
    access: ResourceDefinition.Access
    create: boolean
  }

  export const create = (
    id: string,
    resourceId?: string,
    access: ResourceDefinition.Access = 'read',
    createFile = false,
  ): Element => ({
    kind: 'sqlite-resource',
    ...ResourceDefinition.createIdentity(id, resourceId),
    access,
    create: createFile,
  })

  export const createSchema = (
    options: { reservedNames?: readonly string[] } = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create SQLite Resource',
    updateTitle: 'Update SQLite Resource',
    fields: [
      { type: 'text', key: 'id', label: 'Id', width: 'id', required: true, charset: 'jsIdentifier', minLength: 1, maxLength: 32, reservedNames: options.reservedNames },
      { type: 'select', key: 'access', label: 'Access', defaultValue: 'read', required: true, options: [{ value: 'read', label: 'Read' }, { value: 'read-write', label: 'Read / Write' }] },
      { type: 'checkbox', key: 'create', label: 'Create if missing', defaultValue: 'false', visibleWhen: { key: 'access', value: 'read-write' } },
    ],
    createPreview: () => create('...', 'preview'),
    getInitialValues: (element) => ({ id: element.id, access: element.access, create: String(element.create) }),
    create: (values) => {
      const access = ResourceDefinition.parseAccess(values.access)
      return create(values.id, undefined, access, access === 'read-write' && values.create === 'true')
    },
    update: (element, values) => {
      const access = ResourceDefinition.parseAccess(values.access)
      return { ...element, id: values.id, access, create: access === 'read-write' && values.create === 'true' }
    },
  })

  export const definition = {
    kind: 'sqlite-resource',
    treeLabel: { type: 'static', kindText: 'SQLite', tone: 'master', getValueText: (element: Element) => element.id },
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

export default SqliteResourceElement
