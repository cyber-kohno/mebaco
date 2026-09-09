import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import StateElement from '../variable/store/state-element'
import type VariableDefinition from '../variable/variable-definition'
import StorageItemTreeLabel from './StorageItemTreeLabel.svelte'
import TreeStore from '../../../store/tree-store'
import ElementDeletionController from '../../deletion/element-deletion-controller'
import TypeCatalog from '../type/type-catalog'
import StorageTypeCatalog from './storage-type-catalog'

namespace StorageItemElement {
  export type Kind = 'key-value'
  export type Element = VariableDefinition.Definition & {
    kind: Kind
    storageId: string
  }

  export const create = (
    definition: VariableDefinition.Definition,
    storageId: string = crypto.randomUUID(),
  ): Element => ({ ...definition, kind: 'key-value', storageId })

  export const createSchema = (
    options: Parameters<typeof StateElement.createSchema>[0] = {},
  ): ElementEditSchema.Schema<Element> => {
    const stateSchema = StateElement.createSchema(options)
    const fields = stateSchema.fields.map((field) => {
      if (field.type === 'valueType') return { ...field, allowSignature: false }
      return field.type === 'valueSource' && field.key === 'initial'
        ? { ...field, literalOnly: true }
        : field
    })
    const asState = (element: Element): StateElement.Element => ({
      ...element,
      kind: 'state',
    })
    return {
      createTitle: 'Create Key Value',
      updateTitle: 'Update Key Value',
      tabs: stateSchema.tabs,
      fields,
      createPreview: () => create(stateSchema.createPreview!()),
      getInitialValues: (element) => stateSchema.getInitialValues(asState(element)),
      create: (values) => create(stateSchema.create(values)),
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
        .map((node) => (node.element as Element).id)
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
  } satisfies ElementDefinition.Definition<Element>
}

export default StorageItemElement
