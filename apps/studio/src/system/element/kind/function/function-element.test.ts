import { describe, expect, it, vi } from 'vitest'
import FunctionElement from './function-element'
import FunctionArgumentElement from './function-argument-element'
import FunctionReturnElement from './function-return-element'
import TypeExpression from '../type/type-expression'

vi.mock('../../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))

describe('FunctionElement', () => {
  it('creates a synchronous void function by default', () => {
    expect(FunctionElement.createInline('calculate')).toEqual({
      kind: 'function',
      id: 'calculate',
      mode: 'inline',
      async: false,
      returnType: null,
    })
  })

  it('creates Arguments only for Inline Functions', () => {
    const inlineChildren = FunctionElement.definition.createInitialChildren?.(
      FunctionElement.createInline('inline'),
    )
    const referChildren = FunctionElement.definition.createInitialChildren?.(
      FunctionElement.createRefer('refer', 'signature-id'),
    )

    expect(inlineChildren?.map((seed) => seed.element.kind)).toEqual([
      'function-arguments',
      'function-procedure',
    ])
    expect(referChildren?.map((seed) => seed.element.kind)).toEqual([
      'function-procedure',
    ])
  })

  it('stores argument and return definitions', () => {
    expect(FunctionArgumentElement.create(
      'count',
      TypeExpression.createPrimitive('number'),
      true,
    )).toEqual({
      kind: 'function-argument',
      id: 'count',
      valueType: { type: 'number' },
      nullable: true,
    })
    expect(FunctionReturnElement.create('$args.count')).toEqual({
      kind: 'function-return',
      source: '$args.count',
    })
    expect(FunctionReturnElement.create()).toEqual({
      kind: 'function-return',
    })
  })
})
