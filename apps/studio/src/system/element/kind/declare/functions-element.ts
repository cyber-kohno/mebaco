import type ElementDefinition from '../../element-definition'
import FunctionActions from '../../function-actions'

namespace FunctionsElement {
  export type Kind = 'functions'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'functions',
  })

  export const definition = {
    kind: 'functions',
    treeLabel: {
      type: 'static',
      kindText: 'Functions',
      tone: 'folder',
    },
    getContextMenu: (context) => [
      FunctionActions.createAddFunctionItem(context.node.id, context.rootNode),
    ],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default FunctionsElement
