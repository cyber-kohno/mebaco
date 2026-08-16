import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import TreeStore from '../../../store/tree-store'

namespace DefaultElement {
  export type Kind = 'default'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'default',
  })

  export const definition = {
    kind: 'default',
    treeLabel: {
      type: 'static',
      kindText: 'Default',
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

export default DefaultElement
