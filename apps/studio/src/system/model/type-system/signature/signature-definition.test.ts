import { describe, expect, it } from 'vitest'
import SignatureDefinition from './signature-definition'
import TypeExpression from '../type-expression'
import ValueTypeDefinition from '../value-type-definition'

const parameter = (
  id: string,
  valueType: TypeExpression.Expression = { type: 'string' },
): SignatureDefinition.Parameter => ({
  parameterId: `parameter-${id}`,
  id,
  valueType,
  nullable: false,
})

describe('SignatureDefinition', () => {
  it('round-trips a definition', () => {
    const definition = SignatureDefinition.create(
      true,
      [parameter('payload')],
      ValueTypeDefinition.create({ type: 'boolean' }, true),
    )

    expect(SignatureDefinition.parse(SignatureDefinition.stringify(definition)))
      .toEqual(definition)
  })

  it('requires and preserves stable Parameter identities', () => {
    const value = SignatureDefinition.createParameter(
      'payload',
      TypeExpression.createPrimitive('string'),
      false,
      'payload-parameter',
    )
    const definition = SignatureDefinition.create(false, [value])

    expect(SignatureDefinition.parse(SignatureDefinition.stringify(definition))).toEqual(definition)
    expect(SignatureDefinition.parse(JSON.stringify({
      async: false,
      parameters: [{ id: 'legacy', valueType: { type: 'string' }, nullable: false }],
      returnType: null,
    }))).toBeNull()
    expect(SignatureDefinition.parse(SignatureDefinition.stringify({
      ...definition,
      parameters: [value, { ...value, id: 'duplicateIdentity' }],
    }))).toBeNull()
  })

  it('diffs Parameter updates by parameterId', () => {
    const previous = SignatureDefinition.createParameter(
      'oldName', undefined, false, 'parameter-id',
    )
    const current = { ...previous, id: 'newName' }

    expect(SignatureDefinition.diffParameters([previous], [current]).updated)
      .toEqual([expect.objectContaining({ memberId: 'parameter-id' })])
  })

  it('renders sync and async function types', () => {
    const definition = SignatureDefinition.create(
      false,
      [parameter('payload')],
      ValueTypeDefinition.create(TypeExpression.createReference(['payload-type'])),
    )

    expect(SignatureDefinition.getTypeText(
      definition,
      (typeId) => typeId === 'payload-type' ? 'Payload' : undefined,
    )).toBe('(payload: string) => Payload')

    expect(SignatureDefinition.getTypeText(
      { ...definition, async: true },
      (typeId) => typeId === 'payload-type' ? 'Payload' : undefined,
    )).toBe('(payload: string) => Promise<Payload>')
  })

  it('uses void as the default return type', () => {
    expect(SignatureDefinition.getTypeText(SignatureDefinition.create()))
      .toBe('() => void')
    expect(SignatureDefinition.getTypeText(SignatureDefinition.create(true)))
      .toBe('() => Promise<void>')
  })

  it('validates names and referenced types', () => {
    const duplicateNames = SignatureDefinition.create(false, [
      parameter('value'),
      parameter('value'),
    ])
    expect(SignatureDefinition.validate(duplicateNames, [], []))
      .toBe('Parameter name is duplicated.')

    const invalidReference = SignatureDefinition.create(false, [
      parameter('payload', TypeExpression.createReference(['missing'])),
    ])
    expect(SignatureDefinition.validate(invalidReference, [], []))
      .toBe('Select a valid Object reference.')
  })
})
