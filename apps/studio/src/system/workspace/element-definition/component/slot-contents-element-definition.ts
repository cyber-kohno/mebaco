import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import SlotContents from '@system/model/component/slot-contents'

namespace SlotContentsElementDefinition {
  export const definition = {
    kind: 'slot-contents',
    treeLabel: { type: 'static', kindText: 'Slots', tone: 'folder' },
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<SlotContents.Element>
}

export default SlotContentsElementDefinition
