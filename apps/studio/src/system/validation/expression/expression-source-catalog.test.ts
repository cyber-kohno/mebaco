import { describe, expect, it } from 'vitest'
import ExpressionSourceCatalog from './expression-source-catalog'
import type TreeNode from '../../tree/tree-node'

const node = (
  id: number,
  element: Record<string, unknown>,
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children: [],
})

describe('ExpressionSourceCatalog', () => {
  it('treats literal value-source fields as verification candidates', () => {
    const state = node(3, {
      kind: 'state',
      id: 'name',
      valueType: { type: 'primitive', primitive: 'string' },
      nullable: false,
      initial: { type: 'literal', value: 'fixed' },
    })

    const result = ExpressionSourceCatalog.collect(state, state)

    expect(result.hasExpressionField).toBe(true)
    expect(result.sources).toEqual([])
  })

  it('collects formulas embedded in serialized fields', () => {
    const tag = node(21, {
      kind: 'tag',
      tagName: 'div',
      attributes: JSON.stringify([
        { type: 'attribute', name: 'class', value: { type: 'formula', source: '$state.name' } },
      ]),
      styles: '[]',
    })

    const result = ExpressionSourceCatalog.collect(tag, tag)

    expect(result.hasExpressionField).toBe(true)
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0]).toMatchObject({
      source: '$state.name',
      mode: 'expression',
      label: 'attributes.value',
    })
  })

  it('marks action sources as actions and forbids await unless function is async', () => {
    const action = node(31, {
      kind: 'action',
      source: 'return 1',
    })

    const result = ExpressionSourceCatalog.collect(action, action)

    expect(result.sources).toEqual([
      expect.objectContaining({ mode: 'action', allowAwait: false }),
    ])
  })

  it('assigns number expectation to count loops', () => {
    const loop = node(41, {
      kind: 'loop',
      mode: 'count',
      countSource: '1',
      indexId: 'index',
    })

    const result = ExpressionSourceCatalog.collect(loop, loop)

    expect(result.sources).toEqual([
      expect.objectContaining({
        source: '1',
        expectedTypeText: 'number',
      }),
    ])
  })

  it('assigns the selected value type to Switch expressions', () => {
    const switchNode = node(51, {
      kind: 'switch',
      valueType: { type: 'primitive', primitive: 'number' },
      source: '$state.count',
    })

    const result = ExpressionSourceCatalog.collect(switchNode, switchNode)

    expect(result.sources).toEqual([
      expect.objectContaining({
        source: '$state.count',
        expectedTypeText: 'number',
      }),
    ])
  })

  it('collects Function Code with direct typed parameters', () => {
    const functionNode = node(61, {
      kind: 'function',
      id: 'double',
      signature: {
        mode: 'inline',
        definition: {
          async: false,
          parameters: [{
            parameterId: 'value-parameter', id: 'value',
            valueType: { type: 'number' }, nullable: false,
          }],
          returnType: { valueType: { type: 'number' }, nullable: false },
        },
      },
      implementation: { mode: 'code', source: 'return value * 2' },
    })

    const result = ExpressionSourceCatalog.collect(functionNode, functionNode)

    expect(result.sources).toEqual([
      expect.objectContaining({
        source: 'return value * 2',
        mode: 'code',
        expectedTypeText: 'number',
        functionParameters: [{ name: 'value', typeText: 'number' }],
      }),
    ])
  })
})
