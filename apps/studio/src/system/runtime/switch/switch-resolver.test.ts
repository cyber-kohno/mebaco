import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import FormulaContext from '../formula/formula-context'
import SwitchResolver from './switch-resolver'
import SwitchValueType from '../../element/kind/directive/switch-value-type'

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

const projectNode = node(1000, { kind: 'project' })

describe('SwitchResolver', () => {
  it('selects a matching string Case', () => {
    const matched = node(3, {
      kind: 'case',
      value: { type: 'string', value: 'admin' },
    })
    const switchNode = node(
      1,
      { kind: 'switch', valueType: SwitchValueType.createPrimitive('string'), source: '$state.role' },
      [
        node(2, {
          kind: 'case',
          value: { type: 'string', value: 'worker' },
        }),
        matched,
        node(4, { kind: 'default' }),
      ],
    )

    const result = SwitchResolver.resolve(
      switchNode,
      FormulaContext.create({ $state: { role: 'admin' } }),
      projectNode,
    )

    expect(result).toEqual({ branchNode: matched, error: null })
  })

  it('uses Default when no Case matches', () => {
    const fallback = node(3, { kind: 'default' })
    const switchNode = node(
      1,
      { kind: 'switch', valueType: SwitchValueType.createPrimitive('number'), source: '2' },
      [
        node(2, {
          kind: 'case',
          value: { type: 'number', value: 1 },
        }),
        fallback,
      ],
    )

    expect(SwitchResolver.resolve(
      switchNode,
      FormulaContext.createEmpty(),
      projectNode,
    )).toEqual({ branchNode: fallback, error: null })
  })

  it('rejects an expression result with the wrong type', () => {
    const switchNode = node(
      1,
      { kind: 'switch', valueType: SwitchValueType.createPrimitive('number'), source: "'1'" },
    )

    const result = SwitchResolver.resolve(
      switchNode,
      FormulaContext.createEmpty(),
      projectNode,
    )

    expect(result.branchNode).toBeNull()
    expect(result.error?.message).toBe('Switch expression must return a number.')
  })

  it('rejects duplicated Case values in loaded data', () => {
    const switchNode = node(
      1,
      { kind: 'switch', valueType: SwitchValueType.createPrimitive('string'), source: "'a'" },
      [
        node(2, { kind: 'case', value: { type: 'string', value: 'a' } }),
        node(3, { kind: 'case', value: { type: 'string', value: 'a' } }),
      ],
    )

    const result = SwitchResolver.resolve(
      switchNode,
      FormulaContext.createEmpty(),
      projectNode,
    )

    expect(result.error?.message).toBe('Switch contains a duplicated Case value.')
  })

  it('rejects Case values outside primitive literals', () => {
    const switchNode = node(
      1,
      {
        kind: 'switch',
        valueType: { type: 'primitive', primitive: 'string', literals: ['ready', 'done'] },
        source: "'ready'",
      },
      [
        node(2, { kind: 'case', value: { type: 'string', value: 'other' } }),
      ],
    )

    const result = SwitchResolver.resolve(
      switchNode,
      FormulaContext.createEmpty(),
      projectNode,
    )

    expect(result.error?.message).toBe('Case value is not allowed by the Switch value type.')
  })

  it('rejects expression values outside primitive literals', () => {
    const switchNode = node(
      1,
      {
        kind: 'switch',
        valueType: { type: 'primitive', primitive: 'number', literals: [1, 2] },
        source: '3',
      },
    )

    const result = SwitchResolver.resolve(
      switchNode,
      FormulaContext.createEmpty(),
      projectNode,
    )

    expect(result.error?.message).toBe(
      'Switch expression returned a value outside the Literal Union.',
    )
  })
})
