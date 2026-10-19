import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import Declares from '@system/model/declaration/declares'

namespace DeclaresElementDefinition {
  export const definition = {
    kind: 'declares',
    treeLabel: {
      type: 'static',
      kindText: 'Declares',
      tone: 'manager',
    },
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Declares.Element>
}

export default DeclaresElementDefinition
