import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import FormulaContext from '../formula/formula-context'
import LoopResolver from './loop-resolver'

const node = (
  element: MebacoElement.Element,
): TreeNode.Node => ({
  id: 1,
  element,
  isOpen: true,
  children: [],
})

describe('LoopResolver', () => {
  it('creates zero-based Count contexts', () => {
    const result = LoopResolver.resolve(
      node({ kind: 'loop', mode: 'count', countSource: '3', indexId: 'i' }),
      FormulaContext.createEmpty(),
    )

    expect(result.error).toBeNull()
    expect(result.iterations.map((iteration) => iteration.context.$var.i)).toEqual([0, 1, 2])
  })

  it('injects Collection items and indexes while preserving outer variables', () => {
    const result = LoopResolver.resolve(
      node({
        kind: 'loop',
        mode: 'collection',
        collectionSource: '$state.users',
        itemId: 'user',
        indexId: 'i',
      }),
      FormulaContext.create({
        $state: { users: [{ name: 'A' }, { name: 'B' }] },
        $var: { outer: true },
      }),
    )

    expect(result.error).toBeNull()
    expect(result.iterations[1].context.$var).toEqual({
      outer: true,
      user: { name: 'B' },
      i: 1,
    })
  })

  it('rejects invalid counts and non-array Collections', () => {
    const invalidCount = LoopResolver.resolve(
      node({ kind: 'loop', mode: 'count', countSource: '1.5', indexId: 'i' }),
      FormulaContext.createEmpty(),
    )
    const invalidCollection = LoopResolver.resolve(
      node({
        kind: 'loop',
        mode: 'collection',
        collectionSource: '42',
        itemId: 'item',
        indexId: 'i',
      }),
      FormulaContext.createEmpty(),
    )

    expect(invalidCount.error?.message).toBe(
      'Loop count must be a non-negative finite integer.',
    )
    expect(invalidCollection.error?.message).toBe(
      'Loop collection must return an array.',
    )
  })

  it('enforces the runtime iteration limit', () => {
    const result = LoopResolver.resolve(
      node({
        kind: 'loop',
        mode: 'count',
        countSource: String(LoopResolver.maximumIterations + 1),
        indexId: 'i',
      }),
      FormulaContext.createEmpty(),
    )

    expect(result.iterations).toEqual([])
    expect(result.error?.message).toContain('10,000 or fewer')
  })
})
