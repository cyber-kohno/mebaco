import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TypeCatalog from '@system/model/type-system/type-catalog'
import StorageItemElementDefinition from '@system/workspace/element-definition/storage/storage-item-element-definition'
import StorageTypeCatalog from '@system/model/storage/storage-type-catalog'
import Storage from '@system/model/storage/storage'

namespace StorageElementDefinition {
  export const definition = {
    kind: 'storage',
    treeLabel: { type: 'static', kindText: 'Storage', tone: 'manager' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children.flatMap((node) => (
        node.element.kind === 'key-value' ? [node.element.id] : []
      ))
      const referenceOptions = TypeCatalog.getReferenceOptions(context.rootNode, context.node.id)
        .filter((option) => StorageTypeCatalog.isPersistable(context.rootNode, {
          type: 'reference', objectTypeIds: [option.value],
        }))
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(context.rootNode, context.node.id)
        .filter((option) => option.kind !== 'signature' && StorageTypeCatalog.isPersistable(context.rootNode, {
          type: 'named', namedTypeId: option.value,
        }))
      return [action('Add key value', () => ElementDialog.openCreate(
        context.node.id,
        StorageItemElementDefinition.createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Storage.Element>
}

export default StorageElementDefinition
