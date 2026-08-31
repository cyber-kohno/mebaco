import { beforeEach, describe, expect, it, vi } from 'vitest'
import TreeStore from '../../../store/tree-store'
import type TreeNode from '../../../tree/tree-node'
import LoopElement from './loop-element'

vi.mock('../../../store/tree-store', () => ({
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
    const loop = node(2, LoopElement.createCount('1', 'index')) as TreeNode.Node & {
      element: LoopElement.Element
    }
    const root = node(1, { kind: 'project' }, [loop])
    const item = LoopElement.definition.getContextMenu({
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
