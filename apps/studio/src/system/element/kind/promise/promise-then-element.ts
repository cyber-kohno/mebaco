import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import FunctionActions from '../../function-actions'

namespace PromiseThenElement {
  export type Kind = 'promise-then'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'promise-then' })

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
  } satisfies ElementDefinition.Definition<Element>
}

export default PromiseThenElement
