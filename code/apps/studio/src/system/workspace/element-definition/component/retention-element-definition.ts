import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import RetentionActions from '@system/workspace/tree/context-menu/retention-actions'
import Retention from '@system/model/component/retention'

namespace RetentionElementDefinition {
  export const definition = {
    kind: 'retention',
    treeLabel: {
      type: 'static',
      kindText: 'Retention',
      tone: 'manager',
    },
    getContextMenu: (context) => [
      RetentionActions.createAddDeclareMenu(context.node.id, context.rootNode),
      RetentionActions.createAddStatementMenu(context.node.id, context.rootNode),
      RetentionActions.createAddControlMenu(context.node.id, context.rootNode),
      ContentActions.createAddBlockItem(context.node.id),
    ],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Retention.Element>
}

export default RetentionElementDefinition
