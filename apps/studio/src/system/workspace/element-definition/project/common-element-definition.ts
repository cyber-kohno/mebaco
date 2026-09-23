import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import Common from '@system/model/project/common'

namespace CommonElementDefinition {
  export const definition = {
    kind: 'common',
    treeLabel: {
      type: 'static',
      kindText: 'Common',
      tone: 'manager',
    },
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Common.Element>
}

export default CommonElementDefinition
