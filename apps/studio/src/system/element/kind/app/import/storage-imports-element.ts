import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import type TreeNode from '../../../../tree/tree-node'
import ImportItemsTreeLabel from './ImportItemsTreeLabel.svelte'
import StorageImportCatalog from './storage-import-catalog'

namespace StorageImportsElement {
  export type Kind = 'storage-imports'
  export type Element = { kind: Kind; storageIds: string[] }
  export const create = (): Element => ({ kind: 'storage-imports', storageIds: [] })
  const parse = (source: string): string[] => {
    try { const value: unknown = JSON.parse(source); return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [] } catch { return [] }
  }
  export const createSchema = (rootNode: TreeNode.Node): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Storage Imports', updateTitle: 'Update Storage Imports',
    fields: [{ type: 'storageImports', key: 'storageIds', label: 'Storage', defaultValue: '[]', options: StorageImportCatalog.collect(rootNode).map((node) => ({ value: node.element.storageId, label: node.element.id })) }],
    getInitialValues: (element) => ({ storageIds: JSON.stringify(element.storageIds) }),
    create: (values) => ({ kind: 'storage-imports', storageIds: parse(values.storageIds) }),
    update: (element, values) => ({ ...element, storageIds: parse(values.storageIds) }),
  })
  export const definition = {
    kind: 'storage-imports', treeLabel: { type: 'component', Component: ImportItemsTreeLabel },
    getContextMenu: (context) => { const { action } = ActionMenuState.createFactory(); return [action('Modify', () => ElementDialog.openUpdate(context.node.id, context.element, createSchema(context.rootNode)))] },
    childSlots: [], canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}
export default StorageImportsElement
