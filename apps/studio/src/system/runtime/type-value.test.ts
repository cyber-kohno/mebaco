import { describe, expect, it } from 'vitest'
import type MebacoElement from '../element/element'
import type TreeNode from '../tree/tree-node'
import TypeExpression from '../element/kind/type/type-expression'
import TypeValue from './type-value'

let nextNodeId = 1

const node = (
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id: nextNodeId++,
  element,
  isOpen: true,
  children,
})

describe('TypeValue Signature compatibility', () => {
  it('accepts only functions for a Signature named type', () => {
    const root = node({ kind: 'project' }, [node({
      kind: 'signature-type',
      typeId: 'handler-type',
      id: 'Handler',
      async: false,
      parameters: [],
      returnType: null,
    })])
    const valueType = TypeExpression.createNamed('handler-type')

    expect(TypeValue.isCompatible(valueType, () => undefined, root)).toBe(true)
    expect(TypeValue.isCompatible(valueType, {}, root)).toBe(false)
    expect(TypeValue.isCompatible(valueType, 'handler', root)).toBe(false)
  })
})
