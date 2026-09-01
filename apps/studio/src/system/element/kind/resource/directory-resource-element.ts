import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import ResourceDefinition from './resource-definition'

namespace DirectoryResourceElement {
  export type Kind = 'directory-resource'

  export type TextPolicy = {
    access: ResourceDefinition.Access
    pattern: string
  }

  export type SqlitePolicy = {
    access: ResourceDefinition.Access
    pattern: string
    create: boolean
  }

  export type Element = ResourceDefinition.Identity & {
    kind: Kind
    permissions: {
      access: ResourceDefinition.Access
      deleteFile: boolean
      text: TextPolicy | null
      sqlite: SqlitePolicy | null
    }
  }

  export const create = (
    id: string,
    resourceId?: string,
  ): Element => ({
    kind: 'directory-resource',
    ...ResourceDefinition.createIdentity(id, resourceId),
    permissions: {
      access: 'read',
      deleteFile: false,
      text: null,
      sqlite: null,
    },
  })

  export const createSchema = (
    options: { reservedNames?: readonly string[] } = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Directory Resource',
    updateTitle: 'Update Directory Resource',
    fields: [
      { type: 'text', key: 'id', label: 'Id', width: 'id', required: true, charset: 'jsIdentifier', minLength: 1, maxLength: 32, reservedNames: options.reservedNames },
      { type: 'heading', key: 'directoryPermissions', label: 'Directory permissions' },
      { type: 'select', key: 'access', label: 'Access', defaultValue: 'read', required: true, options: [{ value: 'read', label: 'Read' }, { value: 'read-write', label: 'Read / Write' }] },
      { type: 'heading', key: 'dangerousOperations', label: 'Dangerous operations', visibleWhen: { key: 'access', value: 'read-write' } },
      { type: 'checkbox', key: 'deleteFile', label: 'Delete file', defaultValue: 'false', visibleWhen: { key: 'access', value: 'read-write' } },
      { type: 'heading', key: 'derivedResources', label: 'Derived resources' },
      { type: 'checkbox', key: 'deriveText', label: 'Allow text file', defaultValue: 'false' },
      { type: 'select', key: 'textAccess', label: 'Text access', defaultValue: 'read', required: true, options: [{ value: 'read', label: 'Read' }, { value: 'read-write', label: 'Read / Write' }], visibleWhen: { key: 'deriveText', value: 'true' } },
      { type: 'text', key: 'textPattern', label: 'Text path pattern', defaultValue: '**/*', required: true, maxLength: 256, visibleWhen: { key: 'deriveText', value: 'true' } },
      { type: 'checkbox', key: 'deriveSqlite', label: 'Allow sqlite', defaultValue: 'false' },
      { type: 'select', key: 'sqliteAccess', label: 'SQLite access', defaultValue: 'read', required: true, options: [{ value: 'read', label: 'Read' }, { value: 'read-write', label: 'Read / Write' }], visibleWhen: { key: 'deriveSqlite', value: 'true' } },
      { type: 'text', key: 'sqlitePattern', label: 'SQLite path pattern', defaultValue: '**/*.db', required: true, maxLength: 256, visibleWhen: { key: 'deriveSqlite', value: 'true' } },
      { type: 'checkbox', key: 'sqliteCreate', label: 'Create if missing', defaultValue: 'false', visibleWhenAll: [{ key: 'deriveSqlite', value: 'true' }, { key: 'sqliteAccess', value: 'read-write' }] },
    ],
    createPreview: () => create('...', 'preview'),
    getInitialValues: (element) => ({
      id: element.id,
      access: element.permissions.access,
      deleteFile: String(element.permissions.deleteFile),
      deriveText: String(element.permissions.text != null),
      textAccess: element.permissions.text?.access ?? 'read',
      textPattern: element.permissions.text?.pattern ?? '**/*',
      deriveSqlite: String(element.permissions.sqlite != null),
      sqliteAccess: element.permissions.sqlite?.access ?? 'read',
      sqlitePattern: element.permissions.sqlite?.pattern ?? '**/*.db',
      sqliteCreate: String(element.permissions.sqlite?.create ?? false),
    }),
    create: (values) => fromValues(create(values.id), values),
    update: (element, values) => fromValues({ ...element, id: values.id }, values),
  })

  const fromValues = (element: Element, values: Record<string, string>): Element => ({
    ...element,
    permissions: {
      access: ResourceDefinition.parseAccess(values.access),
      deleteFile: values.access === 'read-write' && values.deleteFile === 'true',
      text: values.deriveText === 'true' ? {
        access: ResourceDefinition.parseAccess(values.textAccess),
        pattern: values.textPattern,
      } : null,
      sqlite: values.deriveSqlite === 'true' ? {
        access: ResourceDefinition.parseAccess(values.sqliteAccess),
        pattern: values.sqlitePattern,
        create: ResourceDefinition.parseAccess(values.sqliteAccess) === 'read-write'
          && values.sqliteCreate === 'true',
      } : null,
    },
  })

  export const definition = {
    kind: 'directory-resource',
    treeLabel: { type: 'static', kindText: 'Directory', tone: 'master', getValueText: (element: Element) => element.id },
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

export default DirectoryResourceElement
