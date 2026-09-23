import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import TreeStore from '@system/workspace/tree/state'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import DefaultDirective from '@system/model/directive/default'

namespace DefaultElementDefinition {
  export const definition = {
    kind: 'default',
    treeLabel: {
      type: 'static',
      kindText: 'Default',
      tone: 'directive',
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
  } satisfies ElementDefinition.Definition<DefaultDirective.Element>
}

export default DefaultElementDefinition

