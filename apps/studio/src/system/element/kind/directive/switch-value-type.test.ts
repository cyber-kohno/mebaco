import { describe, expect, it } from 'vitest'
import ElementEditSchema from '../../../element-dialog/element-edit-schema'
import SwitchValueType from './switch-value-type'

describe('SwitchValueType', () => {
  it('formats primitive switch expression expected types', () => {
    expect(SwitchValueType.getTypeText(
      SwitchValueType.createPrimitive('string'),
    )).toBe('string')
    expect(SwitchValueType.getTypeText(
      SwitchValueType.createPrimitive('number'),
    )).toBe('number')
  })

  it('formats primitive literal switch expression expected types', () => {
    expect(SwitchValueType.getTypeText({
      type: 'primitive',
      primitive: 'string',
      literals: ['ready', 'done'],
    })).toBe("'ready' | 'done'")
    expect(SwitchValueType.getTypeText({
      type: 'primitive',
      primitive: 'number',
      literals: [1, 2],
    })).toBe('1 | 2')
  })

  it('formats literal union switch expression expected types', () => {
    expect(SwitchValueType.getTypeText(
      SwitchValueType.createUnion('status-type-id'),
      [{
        value: 'status-type-id',
        label: 'Status',
        valueType: 'string',
        values: ['ready', 'done'],
        title: "'ready' | 'done'",
      }],
    )).toBe("'ready' | 'done'")
  })

  it('resolves primitive names for literal union options', () => {
    expect(SwitchValueType.getPrimitiveNameFromOptions(
      SwitchValueType.createUnion('status-type-id'),
      [{
        value: 'status-type-id',
        label: 'Status',
        valueType: 'string',
        values: ['ready', 'done'],
        title: "'ready' | 'done'",
      }],
    )).toBe('string')

    expect(SwitchValueType.getPrimitiveNameFromOptions(
      SwitchValueType.createUnion('missing-type-id'),
      [],
    )).toBeNull()
  })

  it('rejects primitive kind changes while cases exist', () => {
    const field: ElementEditSchema.SwitchValueTypeField = {
      type: 'switchValueType',
      key: 'valueType',
      label: 'Value Type',
      literalUnionOptions: [],
      caseValueType: 'string',
    }

    expect(ElementEditSchema.validateSwitchValueType(
      field,
      SwitchValueType.stringify(SwitchValueType.createPrimitive('number')),
    )).toBe('Switch value type must remain string while cases exist.')
  })

  it('allows removing literal restrictions while cases keep the same primitive kind', () => {
    const field: ElementEditSchema.SwitchValueTypeField = {
      type: 'switchValueType',
      key: 'valueType',
      label: 'Value Type',
      literalUnionOptions: [],
      caseValueType: 'string',
    }

    expect(ElementEditSchema.validateSwitchValueType(
      field,
      SwitchValueType.stringify(SwitchValueType.createPrimitive('string')),
    )).toBeNull()
  })

  it('rejects a literal restriction that excludes an existing Case value', () => {
    const field: ElementEditSchema.SwitchValueTypeField = {
      type: 'switchValueType',
      key: 'valueType',
      label: 'Value Type',
      literalUnionOptions: [{
        value: 'next-status-id',
        label: 'NextStatus',
        valueType: 'string',
        values: ['ready', 'done'],
        title: "'ready' | 'done'",
      }],
      caseValueType: 'string',
      caseValues: ['ready', 'failed'],
    }

    expect(ElementEditSchema.validateSwitchValueType(
      field,
      SwitchValueType.stringify(SwitchValueType.createUnion('next-status-id')),
    )).toBe('Existing Case value is not allowed by the selected Switch value type: "failed".')
  })

  it('allows a literal restriction containing every existing Case value', () => {
    const field: ElementEditSchema.SwitchValueTypeField = {
      type: 'switchValueType',
      key: 'valueType',
      label: 'Value Type',
      literalUnionOptions: [],
      caseValueType: 'string',
      caseValues: ['ready'],
    }

    expect(ElementEditSchema.validateSwitchValueType(
      field,
      SwitchValueType.stringify({
        type: 'primitive',
        primitive: 'string',
        literals: ['ready', 'done'],
      }),
    )).toBeNull()
  })
})
