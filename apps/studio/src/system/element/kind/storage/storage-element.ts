import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TypeCatalog from '../type/type-catalog'
import StorageItemElement from './storage-item-element'
import StorageTypeCatalog from './storage-type-catalog'

namespace StorageElement {
  export type Kind = 'storage'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'storage' })

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
        StorageItemElement.createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default StorageElement
