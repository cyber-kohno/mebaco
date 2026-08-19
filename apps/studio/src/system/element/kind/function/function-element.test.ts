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
    expect(FunctionElement.create('calculate')).toEqual({
      kind: 'function',
      id: 'calculate',
      async: false,
      returnType: null,
    })
  })

  it('creates Arguments and Procedure as fixed initial children', () => {
    const children = FunctionElement.definition.createInitialChildren?.()

    expect(children?.map((seed) => seed.element.kind)).toEqual([
      'function-arguments',
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
  })
})
