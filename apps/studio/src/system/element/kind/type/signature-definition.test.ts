import { describe, expect, it } from 'vitest'
import SignatureDefinition from './signature-definition'
import TypeExpression from './type-expression'
import ValueTypeDefinition from './value-type-definition'

const parameter = (
  id: string,
  valueType: TypeExpression.Expression = { type: 'string' },
): SignatureDefinition.Parameter => ({
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
