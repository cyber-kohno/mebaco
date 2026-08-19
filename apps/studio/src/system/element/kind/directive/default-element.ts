import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import TreeStore from '../../../store/tree-store'
import FunctionActions from '../../function-actions'

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
      const isControlBranch = context.parentNode?.element.kind === 'control-switch'
      return [
        ...(isControlBranch
          ? [
              FunctionActions.createAddDeclareMenu(context.node.id, context.rootNode),
              FunctionActions.createAddStatementMenu(context.node.id, context.rootNode),
              FunctionActions.createAddControlMenu(context.node.id, context.rootNode),
              FunctionActions.createAddBlockItem(context.node.id),
            ]
          : ContentActions.createOptionalRetentionItems(context.node, context.rootNode)),
        action('Remove', () => {
          TreeStore.removeNode(context.node.id)
        }, 'danger'),
      ]
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: true,
  } satisfies ElementDefinition.Definition<Element>
}

export default DefaultElement

