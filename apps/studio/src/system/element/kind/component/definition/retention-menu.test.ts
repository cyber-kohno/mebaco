import { describe, expect, it, vi } from 'vitest'
import type ActionMenuState from '../../../../action-menu/action-menu-state'
import type TreeNode from '../../../../tree/tree-node'
import BlockElement from '../../block/block-element'
import RetentionElement from './retention-element'

vi.mock('../../../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    transformNode: vi.fn(),
  },
}))

const expectStatementMenu = (
  items: readonly ActionMenuState.Item[],
  index: number,
) => {
  const statement = items[index]
  expect(statement).toMatchObject({ type: 'parent', label: 'Add statement' })
  if (statement?.type !== 'parent') return
  expect(statement.children.map((item) => item.label)).toEqual(['Action', 'Transition'])
}

const createTree = () => {
  const block: TreeNode.Node & { element: BlockElement.Element } = {
    id: 3,
    element: BlockElement.create(),
    isOpen: true,
    children: [],
  }
  const retention: TreeNode.Node & { element: RetentionElement.Element } = {
    id: 2,
    element: RetentionElement.create(),
    isOpen: true,
    children: [block],
  }
  const root: TreeNode.Node = {
    id: 1,
    element: { kind: 'project' },
    isOpen: true,
    children: [retention],
  }
  return { root, retention, block }
}

describe('Retention statement menu', () => {
  it('groups Action and Transition under Add statement on Retention', () => {
    const { root, retention } = createTree()
    const items = RetentionElement.definition.getContextMenu({
      element: retention.element,
      node: retention,
      parentNode: root,
      rootNode: root,
    })

    expect(items.map((item) => item.label)).toEqual([
      'Add declare',
      'Add statement',
      'Add directive',
      'Add block',
    ])
    expectStatementMenu(items, 1)
  })

  it('uses the same statement menu in a Block under Retention', () => {
    const { root, retention, block } = createTree()
    const items = BlockElement.definition.getContextMenu({
      element: block.element,
      node: block,
      parentNode: retention,
      rootNode: root,
    })

    expect(items.map((item) => item.label)).toEqual([
      'Modify',
      'Add declare',
      'Add statement',
      'Add directive',
      'Add block',
      'Delete',
    ])
    expectStatementMenu(items, 2)
  })
})
