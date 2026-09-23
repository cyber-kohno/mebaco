import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import Store from '@system/model/variable/store'

namespace StoreElementDefinition {
  export const definition = {
    kind: 'store',
    treeLabel: {
      type: 'static',
      kindText: 'Store',
      tone: 'manager',
    },
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Store.Element>
}

export default StoreElementDefinition
