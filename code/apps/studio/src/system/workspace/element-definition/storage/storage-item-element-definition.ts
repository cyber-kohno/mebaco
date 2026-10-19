import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import StateElementDefinition from '@system/workspace/element-definition/variable/store/state-element-definition'
import type State from '@system/model/variable/state'
import StorageItemTreeLabel from '@system/workspace/tree/label/storage/StorageItemTreeLabel.svelte'
import TreeStore from '@system/workspace/tree/state'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'
import TypeCatalog from '@system/model/type-system/type-catalog'
import StorageTypeCatalog from '@system/model/storage/storage-type-catalog'
import StorageItem from '@system/model/storage/storage-item'

namespace StorageItemElementDefinition {
  export const createSchema = (
    options: Parameters<typeof StateElementDefinition.createSchema>[0] = {},
  ): ElementEditSchema.Schema<StorageItem.Element> => {
    const stateSchema = StateElementDefinition.createSchema(options)
    const fields = stateSchema.fields.map((field) => {
      if (field.type === 'valueType') return { ...field, allowSignature: false }
      return field.type === 'valueSource' && field.key === 'initial'
        ? { ...field, literalOnly: true }
        : field
    })
    const asState = (element: StorageItem.Element): State.Element => ({
      ...element,
      kind: 'state',
    })
    return {
      createTitle: 'Create Key Value',
      updateTitle: 'Update Key Value',
      tabs: stateSchema.tabs,
      fields,
      createPreview: () => StorageItem.create(stateSchema.createPreview!()),
      getInitialValues: (element) => stateSchema.getInitialValues(asState(element)),
      create: (values) => StorageItem.create(stateSchema.create(values)),
      update: (element, values) => ({
        ...stateSchema.update(asState(element), values),
        kind: 'key-value',
        storageId: element.storageId,
      }),
    }
  }

  const createSchemaForNode = (
    rootNode: Parameters<typeof TypeCatalog.getReferenceOptions>[0],
    nodeId: number,
    reservedNames: readonly string[],
  ) => createSchema({
    reservedNames,
    referenceOptions: TypeCatalog.getReferenceOptions(rootNode, nodeId)
      .filter((option) => StorageTypeCatalog.isPersistable(rootNode, {
        type: 'reference', objectTypeIds: [option.value],
      })),
    namedTypeOptions: TypeCatalog.getNamedTypeOptions(rootNode, nodeId)
      .filter((option) => option.kind !== 'signature' && StorageTypeCatalog.isPersistable(rootNode, {
        type: 'named', namedTypeId: option.value,
      })),
  })

  export const definition = {
    kind: 'key-value',
    treeLabel: { type: 'component', Component: StorageItemTreeLabel },
    search: { getIdText: (element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id && node.element.kind === 'key-value')
        .map((node) => (node.element as StorageItem.Element).id)
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchemaForNode(context.rootNode, context.node.id, reservedNames),
        )),
        action('Delete', () => {
          void ElementDeletionController.requestDelete({
            rootNode: context.rootNode,
            node: context.node,
            policy: {
              label: `Key Value '${context.element.id}'`,
              structuralReferences: 'block',
              expressionReferences: 'confirm',
            },
            deleteNode: () => TreeStore.removeNode(context.node.id),
          })
        }, 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<StorageItem.Element>
}

export default StorageItemElementDefinition
