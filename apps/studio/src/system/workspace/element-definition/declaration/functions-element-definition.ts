import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import Functions from '@system/model/declaration/functions'

namespace FunctionsElementDefinition {
  export const definition = {
    kind: 'functions',
    treeLabel: {
      type: 'static',
      kindText: 'Functions',
      tone: 'folder',
    },
    getContextMenu: (context) => [
      FunctionActions.createAddFunctionItem(
        context.node.id,
        context.rootNode,
        { label: 'Add function' },
      ),
    ],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Functions.Element>
}

export default FunctionsElementDefinition
