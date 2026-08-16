import { describe, expect, it } from 'vitest'
import ElementEditSchema from './element-edit-schema'
import ValueSource from '../ui/input/value-source'

const field: ElementEditSchema.ValueSourceField = {
  type: 'valueSource',
  key: 'initial',
  label: 'Initial',
  valueTypeKey: 'baseType',
  arrayDepthKey: 'arrayDepth',
  maxFormulaLength: 4000,
}

const validate = (
  value: ValueSource.Value,
  baseType: string,
  arrayDepth = 0,
) => ElementEditSchema.validateValueSource(
  field,
  ValueSource.stringify(value),
  { baseType, arrayDepth: String(arrayDepth) },
)

describe('ElementEditSchema value source', () => {
  it('accepts type-compatible primitive literals', () => {
    expect(validate({ type: 'literal', value: 'text' }, 'string')).toBeNull()
    expect(validate({ type: 'literal', value: '12.5' }, 'number')).toBeNull()
    expect(validate({ type: 'literal', value: 'true' }, 'boolean')).toBeNull()
  })

  it('rejects incompatible primitive literals', () => {
    expect(validate({ type: 'literal', value: '' }, 'number')).toBe('Enter a valid number.')
    expect(validate({ type: 'literal', value: 'yes' }, 'boolean')).toBe('Select true or false.')
  })

  it('rejects literals for Objects and arrays', () => {
    expect(validate({ type: 'literal', value: '{}' }, 'reference')).toBe(
      'Literal is not available for this value type.',
    )
    expect(validate({ type: 'literal', value: '[]' }, 'string', 1)).toBe(
      'Literal is not available for this value type.',
    )
  })

  it('requires Formula source text', () => {
    expect(validate({ type: 'formula', source: '' }, 'reference')).toBe('Enter a formula.')
    expect(validate({ type: 'formula', source: '$state.user' }, 'reference')).toBeNull()
  })
})

describe('ElementEditSchema number field', () => {
  it('rejects a reserved numeric value after parsing', () => {
    const numberField: ElementEditSchema.NumberField = {
      type: 'number',
      key: 'value',
      label: 'Value',
      required: true,
      reservedValues: [1],
    }

    expect(ElementEditSchema.validateNumber(numberField, '01')).toBe('Already exists.')
    expect(ElementEditSchema.validateNumber(numberField, '2')).toBeNull()
  })
})

describe('ElementEditSchema formula field', () => {
  const injectionSource = 'declare var $state: { count: number; title: string; users: { name: string }[]; };'

  it('rejects expressions that do not match primitive expected types', () => {
    const formulaField: ElementEditSchema.FormulaField = {
      type: 'formula',
      key: 'countSource',
      label: 'Count',
      required: true,
      expectedType: 'number',
    }

    expect(ElementEditSchema.validateFormula(
      formulaField,
      '$state.title',
      injectionSource,
    )).toBe('Expression must return number.')
    expect(ElementEditSchema.validateFormula(
      formulaField,
      '$state.count',
      injectionSource,
    )).toBeNull()
  })

  it('rejects empty array literals for collection expressions', () => {
    const formulaField: ElementEditSchema.FormulaField = {
      type: 'formula',
      key: 'collectionSource',
      label: 'Collection',
      required: true,
      expectedType: 'array',
    }

    expect(ElementEditSchema.validateFormula(
      formulaField,
      '[]',
      injectionSource,
    )).toBe('Collection item type could not be inferred.')
  })
})

describe('ElementEditSchema related text fields', () => {
  it('rejects duplicate local variable names', () => {
    const textField: ElementEditSchema.TextField = {
      type: 'text',
      key: 'indexId',
      label: 'Index Variable',
      differentFromKeys: ['itemId'],
    }

    expect(ElementEditSchema.validateText(
      textField,
      'item',
      { itemId: 'item' },
    )).toBe('Must use a different name.')
  })

  it('ignores an inactive related field', () => {
    const textField: ElementEditSchema.TextField = {
      type: 'text',
      key: 'indexId',
      label: 'Index Variable',
      differentFromKeys: ['itemId'],
      differentFromWhen: { key: 'mode', value: 'collection' },
    }

    expect(ElementEditSchema.validateText(
      textField,
      'item',
      { mode: 'count', itemId: 'item' },
    )).toBeNull()
  })
})
