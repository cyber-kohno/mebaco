import type ElementDefinition from '../../../../element-definition'

namespace SlotContentsElement {
  export type Kind = 'slot-contents'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'slot-contents' })

  export const definition = {
    kind: 'slot-contents',
    treeLabel: { type: 'static', kindText: 'Slots', tone: 'folder' },
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default SlotContentsElement
