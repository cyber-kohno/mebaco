import type TreeNode from '@system/model/tree/tree-node'

namespace SlotContent {
  export type Kind = 'slot-content'
  export type Element = { kind: Kind; slotId: string }

  export const create = (slotId: string): Element => ({ kind: 'slot-content', slotId })

  export const createSeed = (slotNode: TreeNode.Node): TreeNode.Seed => ({
    element: create(slotNode.element.kind === 'slot' ? slotNode.element.slotId : ''),
  })
}

export default SlotContent
