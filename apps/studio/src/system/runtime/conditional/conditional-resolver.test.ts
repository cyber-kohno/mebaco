import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import ConditionalResolver from './conditional-resolver'
import FormulaContext from '../formula/formula-context'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element,
  isOpen: true,
  children,
})

describe('ConditionalResolver', () => {
  it('selects the first branch whose condition is true', () => {
    const ifNode = node(2, { kind: 'if', condition: 'false' })
    const elseIfNode = node(3, {
      kind: 'else-if',
      condition: '$state.ready',
    })
    const elseNode = node(4, { kind: 'else' })
    const conditionalNode = node(
      1,
      { kind: 'conditional' },
      [ifNode, elseIfNode, elseNode],
    )

    const result = ConditionalResolver.resolve(
      conditionalNode,
      FormulaContext.create({ $state: { ready: true } }),
    )

    expect(result).toEqual({ branchNode: elseIfNode, error: null })
  })

  it('uses Else when every condition is false', () => {
    const elseNode = node(3, { kind: 'else' })
    const conditionalNode = node(
      1,
      { kind: 'conditional' },
      [node(2, { kind: 'if', condition: 'false' }), elseNode],
    )

    const result = ConditionalResolver.resolve(
      conditionalNode,
      FormulaContext.createEmpty(),
    )

    expect(result).toEqual({ branchNode: elseNode, error: null })
  })

  it('rejects a condition that does not return a boolean', () => {
    const conditionalNode = node(
      1,
      { kind: 'conditional' },
      [node(2, { kind: 'if', condition: '1' })],
    )

    const result = ConditionalResolver.resolve(
      conditionalNode,
      FormulaContext.createEmpty(),
    )

    expect(result.branchNode).toBeNull()
    expect(result.error?.message).toBe('If condition must return a boolean.')
  })
})
