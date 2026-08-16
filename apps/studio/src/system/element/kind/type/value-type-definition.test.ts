import { describe, expect, it } from 'vitest'
import TypeExpression from './type-expression'
import ValueTypeDefinition from './value-type-definition'

describe('ValueTypeDefinition', () => {
  it('formats reference types for Monaco expected return types', () => {
    const definition = ValueTypeDefinition.create(
      TypeExpression.createReference(['user-type-id']),
      false,
    )

    expect(ValueTypeDefinition.getTypeText(
      definition,
      (typeId) => (typeId === 'user-type-id' ? 'User' : undefined),
    )).toBe('User')
  })

  it('includes nullable in Monaco expected return types', () => {
    const definition = ValueTypeDefinition.create(
      TypeExpression.createObject([
        TypeExpression.createProperty('name', TypeExpression.createPrimitive('string')),
      ]),
      true,
    )

    expect(ValueTypeDefinition.getTypeText(definition)).toBe('{ name: string; } | null')
  })
})
