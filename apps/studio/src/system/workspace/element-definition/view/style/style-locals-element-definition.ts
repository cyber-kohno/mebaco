import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import VariableElementDefinition from '@system/workspace/element-definition/variable/variable-element-definition'
import TypeCatalog from '@system/model/type-system/type-catalog'
import TreeStore from '@system/workspace/tree/state'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'
import StyleLocals from '@system/model/view/style/style-locals'
import StyleKeyframesElementDefinition from './style-keyframes-element-definition'

namespace StyleLocalsElementDefinition {
  const createVariableSchema = (
    rootNode: Parameters<typeof TypeCatalog.getReferenceOptions>[0],
    scopeNodeId: number,
    reservedNames: readonly string[],
  ) => VariableElementDefinition.createSchema({
    reservedNames,
    allowMutable: false,
    referenceOptions: TypeCatalog.getReferenceOptions(rootNode, scopeNodeId),
    namedTypeOptions: TypeCatalog.getNamedTypeOptions(rootNode, scopeNodeId),
  })

  export const requestDelete = (
    rootNode: Parameters<typeof ElementDeletionController.requestDelete>[0]['rootNode'],
    node: Parameters<typeof ElementDeletionController.requestDelete>[0]['node'],
  ) => {
    void ElementDeletionController.requestDelete({
      rootNode,
      node,
      referenceNodes: node.children.filter((child) => (
        child.element.kind === 'variable' || child.element.kind === 'style-keyframes'
      )),
      policy: {
        label: 'Style Locals',
        structuralReferences: 'block',
        expressionReferences: 'confirm',
      },
      deleteNode: () => TreeStore.removeNode(node.id),
    })
  }

  export const definition = {
    kind: 'style-locals',
    treeLabel: {
      type: 'static',
      kindText: 'Locals',
      tone: 'manager',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedVariableNames = context.node.children.flatMap((child) => (
        child.element.kind === 'variable' ? [child.element.id] : []
      ))
      const reservedKeyframesNames = context.node.children.flatMap((child) => (
        child.element.kind === 'style-keyframes' ? [child.element.id] : []
      ))
      return [
        action('Add variable', () => {
          ElementDialog.openCreate(
            context.node.id,
            createVariableSchema(context.rootNode, context.node.id, reservedVariableNames),
          )
        }),
        action('Add keyframes', () => {
          ElementDialog.openCreate(
            context.node.id,
            StyleKeyframesElementDefinition.createSchema(reservedKeyframesNames),
          )
        }),
        action('Delete', () => requestDelete(context.rootNode, context.node), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<StyleLocals.Element>
}

export default StyleLocalsElementDefinition
