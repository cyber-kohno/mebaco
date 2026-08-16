import type ElementDefinition from '../../element-definition'

namespace CommonElement {
  export type Kind = 'common'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'common',
  })

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
  } satisfies ElementDefinition.Definition<Element>
}

export default CommonElement
