import type ElementDefinition from '../../element-definition'
import FunctionActions from '../../function-actions'
import FunctionReturnElement from './function-return-element'

namespace FunctionProcedureElement {
  export type Kind = 'function-procedure'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'function-procedure',
  })

  export const definition = {
    kind: 'function-procedure',
    treeLabel: {
      type: 'static',
      kindText: 'Procedure',
      tone: 'manager',
    },
    createInitialChildren: () => [
      { element: FunctionReturnElement.create() },
    ],
    getContextMenu: (context) => {
      const returnIndex = context.node.children.findIndex(
        (child) => child.element.kind === 'function-return',
      )
      const insertIndex = returnIndex < 0 ? undefined : returnIndex
      return [
        FunctionActions.createAddDeclareMenu(
          context.node.id,
          context.rootNode,
          insertIndex,
        ),
        FunctionActions.createAddStatementMenu(
          context.node.id,
          context.rootNode,
          insertIndex,
          returnIndex < 0,
        ),
        FunctionActions.createAddControlMenu(context.node.id, context.rootNode),
        FunctionActions.createAddBlockItem(context.node.id, insertIndex),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default FunctionProcedureElement
