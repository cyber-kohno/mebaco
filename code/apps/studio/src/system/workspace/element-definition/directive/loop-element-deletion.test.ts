import { beforeEach, describe, expect, it, vi } from 'vitest'
import TreeStore from '@system/workspace/tree/state'
import type TreeNode from '@system/model/tree/tree-node'
import Loop from '@system/model/directive/loop'
import LoopElementDefinition from './loop-element-definition'

vi.mock('@system/workspace/tree/state', () => ({
  default: {
    removeNode: vi.fn(),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('Loop deletion policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes the Loop subtree without reference confirmation', () => {
    const loop = node(2, Loop.createCount('1', 'index')) as TreeNode.Node & {
      element: Loop.Element
    }
    const root = node(1, { kind: 'project' }, [loop])
    const item = LoopElementDefinition.definition.getContextMenu({
      element: loop.element,
      node: loop,
      parentNode: root,
      rootNode: root,
    }).find((candidate) => candidate.label === 'Delete')
    if (item?.type !== 'action') throw new Error('Delete action was not found.')

    item.callback()

    expect(TreeStore.removeNode).toHaveBeenCalledWith(loop.id)
  })
})
