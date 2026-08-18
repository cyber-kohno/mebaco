import type ElementDefinition from '../../../element-definition'
import ContentActions from '../../../content-actions'
import RetentionActions from '../../../retention-actions'

namespace RetentionElement {
  export type Kind = 'retention'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'retention',
  })

  export const definition = {
    kind: 'retention',
    treeLabel: {
      type: 'static',
      kindText: 'Retention',
      tone: 'manager',
    },
    getContextMenu: (context) => [
      RetentionActions.createAddDeclareMenu(context.node.id, context.rootNode),
      RetentionActions.createAddActionItem(context.node.id),
      ContentActions.createAddBlockItem(context.node.id),
    ],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default RetentionElement
