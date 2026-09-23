import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import PromiseThen from '@system/model/promise/promise-then'

namespace PromiseThenElementDefinition {
  export const definition = {
    kind: 'promise-then',
    treeLabel: { type: 'static', kindText: 'Then', tone: 'condition' },
    getContextMenu: (context) => {
      ActionMenuState.createFactory()
      return [
        FunctionActions.createAddDeclareMenu(context.node.id, context.rootNode),
        FunctionActions.createAddStatementMenu(
          context.node.id,
          context.rootNode,
          undefined,
          false,
        ),
        FunctionActions.createAddControlMenu(context.node.id, context.rootNode),
        FunctionActions.createAddBlockItem(context.node.id),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<PromiseThen.Element>
}

export default PromiseThenElementDefinition
