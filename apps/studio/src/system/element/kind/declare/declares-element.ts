import type ElementDefinition from '../../element-definition'

namespace DeclaresElement {
  export type Kind = 'declares'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'declares',
  })

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
  } satisfies ElementDefinition.Definition<Element>
}

export default DeclaresElement
