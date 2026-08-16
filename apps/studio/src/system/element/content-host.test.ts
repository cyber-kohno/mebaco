import { describe, expect, it } from 'vitest'
import ContentHost from './content-host'
import type TreeNode from '../tree/tree-node'

const createNodeFactory = () => {
  let nextId = 100
  const createNode = (seed: TreeNode.Seed): TreeNode.Node => ({
    id: nextId++,
    element: seed.element,
    isOpen: seed.isOpen ?? true,
    children: (seed.children ?? []).map(createNode),
  })

  return createNode
}

const createTagNode = (children: TreeNode.Node[]): TreeNode.Node => ({
  id: 1,
  element: {
    kind: 'tag',
    tagName: 'div',
    comment: '',
    styles: [],
    attributes: [],
  },
  isOpen: true,
  children,
})

const createTextNode = (id: number): TreeNode.Node => ({
  id,
  element: {
    kind: 'text',
    source: {
      type: 'plain',
      value: `Text ${id}`,
    },
  },
  isOpen: true,
  children: [],
})

describe('ContentHost', () => {
  it('wraps and unwraps content without changing content node identity or order', () => {
    const children = [createTextNode(2), createTextNode(3)]
    const tagNode = createTagNode(children)
    const createNode = createNodeFactory()

    expect(ContentHost.useRetention(tagNode, createNode)).toBe(true)
    expect(tagNode.children.map((node) => node.element.kind)).toEqual([
      'retention',
      'elements',
    ])
    expect(ContentHost.getContentChildren(tagNode).map((node) => node.id)).toEqual([2, 3])

    expect(ContentHost.removeRetention(tagNode)).toBe(true)
    expect(tagNode.children.map((node) => node.id)).toEqual([2, 3])
  })

  it('does not remove a retention branch that contains programs', () => {
    const tagNode = createTagNode([])
    const createNode = createNodeFactory()
    ContentHost.useRetention(tagNode, createNode)

    tagNode.children[0].children.push(createTextNode(4))

    expect(ContentHost.canRemoveRetention(tagNode)).toBe(false)
    expect(ContentHost.removeRetention(tagNode)).toBe(false)
  })
})
