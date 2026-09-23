import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TypeCatalog from '@system/model/type-system/type-catalog'
import TypedDefaultValueSchema from '@system/workspace/element-definition/schema/typed-default-value-schema'
import ValuePropTreeLabel from '@system/workspace/tree/label/component/ValuePropTreeLabel.svelte'
import TreeStore from '@system/workspace/tree/state'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'
import TreeNode from '@system/model/tree/tree-node'
import ValueProp from '@system/model/component/value-prop'

namespace ValuePropElementDefinition {
  export type CreateSchemaOptions = TypedDefaultValueSchema.Options

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ) => TypedDefaultValueSchema.create<ValueProp.Element>({
    createTitle: 'Create Value Prop',
    updateTitle: 'Update Value Prop',
    createPreview: () => ValueProp.create('...'),
    createElement: (values) => ValueProp.create(
      values.id,
      values.valueType,
      values.nullable,
      values.defaultValue,
    ),
  }, options)

  const isComponentProp = (
    rootNode: TreeNode.Node,
    nodeId: number,
  ): boolean => TreeNode.findPath(rootNode, nodeId)?.at(-3)?.element.kind === 'component'

  export const definition = {
    kind: 'value-prop',
    treeLabel: {
      type: 'component',
      Component: ValuePropTreeLabel,
    },
    search: { getIdText: (element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is ValueProp.Element => element.kind === 'value-prop')
        .map((element) => element.id)
      const referenceOptions = TypeCatalog.getReferenceOptions(
        context.rootNode,
        context.node.id,
      )
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(
        context.rootNode,
        context.node.id,
      )

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
          )
        }),
        action('Delete', () => {
          if (!isComponentProp(context.rootNode, context.node.id)) {
            TreeStore.removeNode(context.node.id)
            return
          }
          void ElementDeletionController.requestDelete({
            rootNode: context.rootNode,
            node: context.node,
            policy: {
              label: `Prop '${context.element.id}'`,
              structuralReferences: 'ignore',
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
  } satisfies ElementDefinition.Definition<ValueProp.Element>
}

export default ValuePropElementDefinition
