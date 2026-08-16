import { describe, expect, it } from 'vitest'
import type TreeNode from '../tree/tree-node'
import RuntimeTree from './runtime-tree'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element,
  isOpen: true,
  children,
})

describe('RuntimeTree', () => {
  it('finds root view nodes below a component Elements branch', () => {
    const tagNode = node(5, {
      kind: 'tag',
      tagName: 'div',
      comment: '',
      styles: [],
      attributes: [],
    })
    const componentNode = node(1, { kind: 'component', id: 'Sample' }, [
      node(2, { kind: 'props' }),
      node(3, { kind: 'retention' }),
      node(4, { kind: 'elements' }, [tagNode]),
    ])

    expect(RuntimeTree.getComponentRootViewNodes(componentNode)).toEqual([tagNode])
  })
})
