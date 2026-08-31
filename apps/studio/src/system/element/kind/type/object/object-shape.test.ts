import { describe, expect, it } from 'vitest'
import TypeExpression from '../type-expression'
import ObjectShape from './object-shape'

describe('ObjectShape', () => {
  it('rejects the same inherited contract when Property identities differ', () => {
    const first = TypeExpression.createProperty('name', undefined, 'first-property')
    const second = TypeExpression.createProperty('name', undefined, 'second-property')
    const shape = ObjectShape.create([], ['first-object', 'second-object'])

    expect(ObjectShape.validate(shape, [
      { value: 'first-object', label: 'First', baseObjectIds: [], properties: [first] },
      { value: 'second-object', label: 'Second', baseObjectIds: [], properties: [second] },
    ])).toBe('Inherited property "name" conflicts.')
  })

  it('still rejects inherited properties with different contracts', () => {
    const first = TypeExpression.createProperty(
      'value', TypeExpression.createPrimitive('string'), 'first-property',
    )
    const second = TypeExpression.createProperty(
      'value', TypeExpression.createPrimitive('number'), 'second-property',
    )
    const shape = ObjectShape.create([], ['first-object', 'second-object'])

    expect(ObjectShape.validate(shape, [
      { value: 'first-object', label: 'First', baseObjectIds: [], properties: [first] },
      { value: 'second-object', label: 'Second', baseObjectIds: [], properties: [second] },
    ])).toBe('Inherited property "value" conflicts.')
  })

  it('accepts a shared Property identity reached through diamond inheritance', () => {
    const shared = TypeExpression.createProperty('name', undefined, 'shared-property')
    const shape = ObjectShape.create([], ['first-object', 'second-object'])

    expect(ObjectShape.validate(shape, [
      {
        value: 'shared-object',
        label: 'Shared',
        baseObjectIds: [],
        properties: [shared],
      },
      {
        value: 'first-object',
        label: 'First',
        baseObjectIds: ['shared-object'],
        properties: [],
      },
      {
        value: 'second-object',
        label: 'Second',
        baseObjectIds: ['shared-object'],
        properties: [],
      },
    ])).toBeNull()
  })

  it('identifies the local Property and Base involved in a collision', () => {
    const inherited = TypeExpression.createProperty('name', undefined, 'inherited-property')
    const local = TypeExpression.createProperty('name', undefined, 'local-property')
    const shape = ObjectShape.create([local], ['base-object'])

    expect(ObjectShape.inspect(shape, [
      { value: 'base-object', label: 'Base', baseObjectIds: [], properties: [inherited] },
    ])).toEqual({
      type: 'local-property-conflict',
      message: 'Local property "name" conflicts with a Base Object.',
      propertyName: 'name',
      propertyId: 'local-property',
      inheritedPropertyId: 'inherited-property',
      baseObjectIds: ['base-object'],
    })
  })
})
