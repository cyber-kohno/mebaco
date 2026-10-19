import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import Elements from '@system/model/component/elements'

namespace ElementsElementDefinition {
  export const definition = {
    kind: 'elements',
    treeLabel: {
      type: 'static',
      kindText: 'Elements',
      tone: 'folder',
    },
    getContextMenu: (context) => [
      ContentActions.createAddMenu(context.node.id, context.rootNode),
      ContentActions.createAddDirectiveMenu(context.node.id, context.rootNode),
      ContentActions.createAddBlockItem(context.node.id),
    ],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Elements.Element>
}

export default ElementsElementDefinition
