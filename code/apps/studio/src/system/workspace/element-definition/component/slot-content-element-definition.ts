import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import SlotContent from '@system/model/component/slot-content'
import SlotContentTreeLabel from '@system/workspace/tree/label/component/SlotContentTreeLabel.svelte'

namespace SlotContentElementDefinition {
  export const definition = {
    kind: 'slot-content',
    treeLabel: { type: 'component', Component: SlotContentTreeLabel },
    getContextMenu: (context) => {
      return [
        ...ContentActions.createOptionalRetentionItems(context.node, context.rootNode),
      ]
    },
    contentHost: { retention: 'optional' },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<SlotContent.Element>
}

export default SlotContentElementDefinition
