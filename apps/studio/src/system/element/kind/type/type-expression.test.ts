import { describe, expect, it } from 'vitest'
import TypeExpression from './type-expression'

describe('TypeExpression named type kinds', () => {
  it('keeps an empty Signature selection distinct from an empty Union selection', () => {
    const union = TypeExpression.createNamed()
    const signature = TypeExpression.createNamed('', 'signature')

    expect(union).toEqual({ type: 'named', namedTypeId: '' })
    expect(signature).toEqual({
      type: 'named',
      namedTypeId: '',
      namedTypeKind: 'signature',
    })
    expect(TypeExpression.parseExpression(JSON.stringify(signature))).toEqual(signature)
  })
})
