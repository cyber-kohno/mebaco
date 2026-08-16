import type ElementDefinition from '../../element-definition'
import ContentActions from '../../content-actions'

namespace ElementsElement {
  export type Kind = 'elements'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'elements',
  })

  export const definition = {
    kind: 'elements',
    treeLabel: {
      type: 'static',
      kindText: 'Elements',
      tone: 'folder',
    },
    getContextMenu: (context) => [
      ContentActions.createAddMenu(context.node.id, context.rootNode),
      ContentActions.createAddDirectiveMenu(context.node.id),
      ContentActions.createAddBlockItem(context.node.id),
    ],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ElementsElement
