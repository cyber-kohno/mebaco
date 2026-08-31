import type ElementDefinition from '../../../element-definition'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import VariableElement from '../../variable/variable-element'
import TypeCatalog from '../../type/type-catalog'
import TreeStore from '../../../../store/tree-store'
import ElementDeletionController from '../../../deletion/element-deletion-controller'

namespace StyleLocalsElement {
  export type Kind = 'style-locals'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'style-locals',
  })

  const createVariableSchema = (
    rootNode: Parameters<typeof TypeCatalog.getReferenceOptions>[0],
    scopeNodeId: number,
    reservedNames: readonly string[],
  ) => VariableElement.createSchema({
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
      referenceNodes: node.children.filter((child) => child.element.kind === 'variable'),
      policy: {
        label: 'Style Locals',
        structuralReferences: 'ignore',
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
      const reservedNames = context.node.children.flatMap((child) => (
        child.element.kind === 'variable' ? [child.element.id] : []
      ))
      return [
        action('Add variable', () => {
          ElementDialog.openCreate(
            context.node.id,
            createVariableSchema(context.rootNode, context.node.id, reservedNames),
          )
        }),
        action('Delete', () => requestDelete(context.rootNode, context.node), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default StyleLocalsElement
