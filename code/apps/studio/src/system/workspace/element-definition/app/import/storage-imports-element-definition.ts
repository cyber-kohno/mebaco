import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import type TreeNode from '@system/model/tree/tree-node'
import ImportItemsTreeLabel from '@system/workspace/tree/label/app/import/ImportItemsTreeLabel.svelte'
import StorageImportCatalog from '@system/model/app/import/storage-import-catalog'
import type StorageImports from '@system/model/app/import/storage-imports'

namespace StorageImportsElementDefinition {
  const parse = (source: string): string[] => {
    try { const value: unknown = JSON.parse(source); return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [] } catch { return [] }
  }
  export const createSchema = (rootNode: TreeNode.Node): ElementEditSchema.Schema<StorageImports.Element> => ({
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
  } satisfies ElementDefinition.Definition<StorageImports.Element>
}
export default StorageImportsElementDefinition
