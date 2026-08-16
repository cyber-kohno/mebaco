import type ElementDefinition from '../../../element-definition'

namespace StoreElement {
  export type Kind = 'store'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'store',
  })

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
  } satisfies ElementDefinition.Definition<Element>
}

export default StoreElement
