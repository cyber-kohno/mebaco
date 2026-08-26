import { describe, expect, it } from 'vitest'
import type TreeNode from './tree-node'
import TreeReorder from './tree-reorder'
import type ElementDefinition from '../element/element-definition'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const style = (id: string): TreeNode.Node['element'] => ({
  kind: 'style',
  styleId: `${id}-style-id`,
  id,
  rules: [],
  bases: [],
})

const resolveGroup = (
  node: TreeNode.Node,
): ElementDefinition.ReorderGroup | null => (
  node.element.kind === 'style'
    ? 'siblings'
    : node.element.kind === 'else-if'
      ? 'conditional-branch'
      : node.element.kind === 'case'
        ? 'switch-case'
        : null
)

describe('TreeReorder', () => {
  it('moves reorderable siblings while preserving the selected node id', () => {
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'styles' }, [
        node(3, style('first')),
        node(4, style('second')),
      ]),
    ])

    expect(TreeReorder.canMove(root, 4, -1, resolveGroup)).toBe(true)
    expect(TreeReorder.move(root, 4, -1, resolveGroup)).toBe(true)
    expect(root.children[0].children.map((child) => child.id)).toEqual([4, 3])
  })

  it('keeps conditional branch boundaries intact', () => {
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'conditional' }, [
        node(3, { kind: 'if', condition: 'true' }),
        node(4, { kind: 'else-if', condition: 'false' }),
        node(5, { kind: 'else-if', condition: 'false' }),
        node(6, { kind: 'else' }),
      ]),
    ])

    expect(TreeReorder.canMove(root, 4, -1, resolveGroup)).toBe(false)
    expect(TreeReorder.canMove(root, 5, -1, resolveGroup)).toBe(true)
    expect(TreeReorder.canMove(root, 5, 1, resolveGroup)).toBe(false)
  })

  it('keeps switch cases before the default branch', () => {
    const root = node(1, { kind: 'project' }, [
      node(2, {
        kind: 'switch',
        valueType: { type: 'primitive', primitive: 'string' },
        source: '$state.value',
      }, [
        node(3, { kind: 'case', value: { type: 'string', value: 'a' } }),
        node(4, { kind: 'case', value: { type: 'string', value: 'b' } }),
        node(5, { kind: 'default' }),
      ]),
    ])

    expect(TreeReorder.canMove(root, 4, -1, resolveGroup)).toBe(true)
    expect(TreeReorder.canMove(root, 4, 1, resolveGroup)).toBe(false)
  })
})
