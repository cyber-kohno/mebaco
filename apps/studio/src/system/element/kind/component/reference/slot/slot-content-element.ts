import type ElementDefinition from '../../../../element-definition'
import ContentActions from '../../../../content-actions'
import type TreeNode from '../../../../../tree/tree-node'
import SlotContentTreeLabel from './SlotContentTreeLabel.svelte'

namespace SlotContentElement {
  export type Kind = 'slot-content'
  export type Element = { kind: Kind; slotId: string }

  export const create = (slotId: string): Element => ({ kind: 'slot-content', slotId })

  export const createSeed = (slotNode: TreeNode.Node): TreeNode.Seed => ({
    element: create(slotNode.element.kind === 'slot' ? slotNode.element.slotId : ''),
  })

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
  } satisfies ElementDefinition.Definition<Element>
}

export default SlotContentElement
