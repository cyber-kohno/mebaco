import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import FunctionProcedure from '@system/model/function/function-procedure'

namespace FunctionProcedureElementDefinition {
  export const definition = {
    kind: 'function-procedure',
    treeLabel: {
      type: 'static',
      kindText: 'Procedure',
      tone: 'manager',
    },
    createInitialChildren: () => [],
    getContextMenu: (context) => {
      return [
        FunctionActions.createAddDeclareMenu(
          context.node.id,
          context.rootNode,
        ),
        FunctionActions.createAddStatementMenu(
          context.node.id,
          context.rootNode,
        ),
        FunctionActions.createAddControlMenu(context.node.id, context.rootNode),
        FunctionActions.createAddBlockItem(context.node.id),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<FunctionProcedure.Element>
}

export default FunctionProcedureElementDefinition
