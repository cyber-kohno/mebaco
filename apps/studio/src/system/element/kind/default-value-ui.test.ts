import { describe, expect, it, vi } from 'vitest'
import LaunchArgumentElement from './app/launch-argument-element'
import ValuePropElement from './component/definition/value-prop-element'
import StateElement from './variable/store/state-element'
import TypeExpression from './type/type-expression'
import ValueTypeDefinition from './type/value-type-definition'
import ValueSource from '../../ui/input/value-source'

vi.mock('../../store/tree-store', () => ({
  default: {
    removeNode: vi.fn(),
  },
}))

describe.each([
  ['Launch Argument', LaunchArgumentElement.createSchema()],
  ['Value Prop', ValuePropElement.createSchema()],
])('%s default value UI', (_label, schema) => {
  it('resets the default value fields when the Value Type changes', () => {
    expect(schema.fields.find((field) => field.key === 'valueType')).toMatchObject({
      type: 'valueType',
      resetWhenChanged: ['hasDefaultValue', 'defaultValue'],
    })
  })

  it('enables Use Default Value only for a valid Value Type', () => {
    expect(schema.fields.find((field) => field.key === 'hasDefaultValue')).toMatchObject({
      type: 'checkbox',
      defaultValue: 'false',
      enabledWhenValid: 'valueType',
    })
  })
})

describe('shared typed default value schema', () => {
  const valueType = ValueTypeDefinition.stringify(ValueTypeDefinition.create(
    TypeExpression.wrapArray(TypeExpression.createPrimitive('number'), 1),
  ))
  const defaultValue = ValueSource.stringify({ type: 'default' })
  const values = {
    id: 'scores',
    valueType,
    hasDefaultValue: 'true',
    defaultValue,
  }

  it('keeps Launch Argument and Value Prop field definitions identical', () => {
    const launchFields = JSON.parse(JSON.stringify(LaunchArgumentElement.createSchema().fields))
    const propFields = JSON.parse(JSON.stringify(ValuePropElement.createSchema().fields))

    expect(launchFields).toEqual(propFields)
  })

  it('applies the shared value conversion when creating both elements', () => {
    expect(LaunchArgumentElement.createSchema().create(values)).toEqual({
      kind: 'launch-argument',
      propId: expect.any(String),
      id: 'scores',
      valueType: { type: 'array', item: { type: 'number' } },
      nullable: false,
      defaultValue: { type: 'default' },
    })
    expect(ValuePropElement.createSchema().create(values)).toMatchObject({
      kind: 'value-prop',
      id: 'scores',
      valueType: { type: 'array', item: { type: 'number' } },
      nullable: false,
      defaultValue: { type: 'default' },
    })
  })

  it('preserves the Value Prop identity when applying shared updates', () => {
    const element = ValuePropElement.create(
      'oldScores',
      TypeExpression.createPrimitive(),
      false,
      undefined,
      '00000000-0000-0000-0000-000000000000',
    )

    expect(ValuePropElement.createSchema().update(element, values)).toMatchObject({
      kind: 'value-prop',
      propId: '00000000-0000-0000-0000-000000000000',
      id: 'scores',
      valueType: { type: 'array', item: { type: 'number' } },
      nullable: false,
      defaultValue: { type: 'default' },
    })
  })

  it('provides a friendly Type default preview through the shared schema', () => {
    const schema = LaunchArgumentElement.createSchema({
      referenceOptions: [{ value: 'user', label: 'User' }],
      namedTypeOptions: [{
        value: 'handler',
        label: 'Handler',
        kind: 'signature',
        defaultValueLabel: '() => User(default)',
      }],
    })
    const field = schema.fields.find((candidate) => candidate.key === 'defaultValue')
    if (field?.type !== 'valueSource') throw new Error('Default Value field was not found.')

    expect(field.getTypeDefaultLabel?.({
      valueType: ValueTypeDefinition.stringify(ValueTypeDefinition.create(
        TypeExpression.createReference(['user']),
      )),
    })).toBe('User(default)')
    expect(field.getTypeDefaultLabel?.({
      valueType: ValueTypeDefinition.stringify(ValueTypeDefinition.create(
        TypeExpression.createNamed('handler', 'signature'),
      )),
    })).toBe('() => User(default)')
  })
})

describe('State Type default preview', () => {
  it('resets Initial whenever the Value Type changes', () => {
    expect(StateElement.createSchema().fields.find(
      (candidate) => candidate.key === 'valueType',
    )).toMatchObject({
      type: 'valueType',
      resetWhenChanged: ['initial'],
    })
  })

  it('shows Initial only while the Value Type is valid', () => {
    expect(StateElement.createSchema().fields.find(
      (candidate) => candidate.key === 'initial',
    )).toMatchObject({
      type: 'valueSource',
      visibleWhenValid: 'valueType',
    })
  })

  it('uses the same friendly label for Initial', () => {
    const field = StateElement.createSchema().fields.find(
      (candidate) => candidate.key === 'initial',
    )
    if (field?.type !== 'valueSource') throw new Error('Initial field was not found.')

    expect(field.getTypeDefaultLabel?.({
      valueType: ValueTypeDefinition.stringify(ValueTypeDefinition.create(
        TypeExpression.createPrimitive('number'),
        true,
      )),
    })).toBe('null')
  })
})
