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

  it('creates and preserves a stable Property identity', () => {
    const property = TypeExpression.createProperty(
      'name',
      TypeExpression.createPrimitive('string'),
      'name-property',
    )

    expect(property.propertyId).toBe('name-property')
    expect(TypeExpression.parseProperties(JSON.stringify([property]))).toEqual([property])
    expect(TypeExpression.parseProperties(JSON.stringify([{
      id: 'legacy', valueType: { type: 'string' }, optional: false, nullable: false,
    }]))).toBeNull()
    expect(TypeExpression.parseProperties(JSON.stringify([property, property]))).toBeNull()
  })

  it('diffs Property updates by propertyId', () => {
    const previous = TypeExpression.createProperty('oldName', undefined, 'property-id')
    const current = { ...previous, id: 'newName' }

    expect(TypeExpression.diffProperties([previous], [current]).updated)
      .toEqual([expect.objectContaining({ memberId: 'property-id' })])
  })

  it('ignores Property identities when comparing contracts, including inline properties', () => {
    const first = TypeExpression.createProperty('value', TypeExpression.createObject([
      TypeExpression.createProperty('nested', undefined, 'nested-a'),
    ]), 'root-a')
    const second = TypeExpression.createProperty('value', TypeExpression.createObject([
      TypeExpression.createProperty('nested', undefined, 'nested-b'),
    ]), 'root-b')

    expect(TypeExpression.getPropertyContractFingerprint(first))
      .toBe(TypeExpression.getPropertyContractFingerprint(second))
  })
})

describe('TypeExpression property identifiers', () => {
  it('rejects TypeScript reserved property names', () => {
    expect(TypeExpression.validateProperties([
      TypeExpression.createProperty('return'),
    ])).toContain('reserved')
  })
})
