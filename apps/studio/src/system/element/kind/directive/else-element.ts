import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import TreeStore from '../../../store/tree-store'

namespace ElseElement {
  export type Kind = 'else'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'else',
  })

  export const definition = {
    kind: 'else',
    treeLabel: {
      type: 'static',
      kindText: 'Else',
      tone: 'condition',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        ...ContentActions.createOptionalRetentionItems(
          context.node,
          context.rootNode,
        ),
        action('Remove', () => {
          TreeStore.removeNode(context.node.id)
        }, 'danger'),
      ]
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ElseElement
