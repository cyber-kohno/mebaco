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
    expect(validate({ type: 'formula', source: ' \n\t' }, 'reference')).toBe('Enter a formula.')
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

describe('ElementEditSchema Bundle definition', () => {
  const bundleField: ElementEditSchema.BundleDefinitionField = {
    type: 'bundleDefinition',
    key: 'launcherIds',
    label: 'Launchers',
    options: [{ value: 'launcher-a', label: 'A' }],
  }

  it('accepts an ordered unique Launcher list and rejects missing references', () => {
    expect(ElementEditSchema.validateBundleDefinition(bundleField, '[]')).toBeNull()
    expect(ElementEditSchema.validateBundleDefinition(
      bundleField,
      '["launcher-a","launcher-a"]',
    )).toBe('Launcher is duplicated.')
    expect(ElementEditSchema.validateBundleDefinition(bundleField, '["missing"]'))
      .toBe('Remove missing Launchers.')
  })
})

describe('ElementEditSchema Style Parameter literal', () => {
  const literalField: ElementEditSchema.LiteralField = {
    type: 'literal',
    key: 'defaultValue',
    label: 'Default Value',
    valueTypeKey: 'valueType',
    enabledWhen: { key: 'hasDefaultValue', value: 'true' },
  }

  it('rejects an empty Color and accepts the Color type default', () => {
    const values = { valueType: 'color', hasDefaultValue: 'true' }
    expect(ElementEditSchema.validateLiteral(literalField, '', values))
      .toBe('Enter a valid color.')
    expect(ElementEditSchema.validateLiteral(literalField, '#000', values)).toBeNull()
  })
})

describe('ElementEditSchema formula field', () => {
  const injectionSource = 'declare var $state: { count: number; title: string; users: { name: string }[]; };'

  it('requires non-whitespace source without validating its meaning', () => {
    const formulaField: ElementEditSchema.FormulaField = {
      type: 'formula',
      key: 'source',
      label: 'Formula',
      required: true,
    }

    expect(ElementEditSchema.validateFormula(formulaField, '')).toBe('Required.')
    expect(ElementEditSchema.validateFormula(formulaField, ' \n\t')).toBe('Required.')
    expect(ElementEditSchema.validateFormula(formulaField, 'a')).toBeNull()
  })

  it('does not block saving based on expression result types', () => {
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
    )).toBeNull()
    expect(ElementEditSchema.validateFormula(
      formulaField,
      '$state.count',
      injectionSource,
    )).toBeNull()
  })

  it('does not block saving based on collection item inference', () => {
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
    )).toBeNull()
  })
})

describe('ElementEditSchema Tag Ref key', () => {
  const injectionSource = 'declare var $var: { index: number; };'

  it('accepts disabled, literal, and string formula values', () => {
    expect(ElementEditSchema.validateTagRefKey('', injectionSource)).toBeNull()
    expect(ElementEditSchema.validateTagRefKey(
      JSON.stringify({ type: 'literal', value: 'sidePanel' }),
      injectionSource,
    )).toBeNull()
    expect(ElementEditSchema.validateTagRefKey(
      JSON.stringify({ type: 'formula', source: '`recordFrame${$var.index}`' }),
      injectionSource,
    )).toBeNull()
  })

  it('requires an enabled key to be present without type-validating its formula', () => {
    expect(ElementEditSchema.validateTagRefKey(
      JSON.stringify({ type: 'literal', value: '' }),
      injectionSource,
    )).toBe('Enter a Ref key.')
    expect(ElementEditSchema.validateTagRefKey(
      JSON.stringify({ type: 'formula', source: ' \n\t' }),
      injectionSource,
    )).toBe('Enter a Ref key formula.')
    expect(ElementEditSchema.validateTagRefKey(
      JSON.stringify({ type: 'formula', source: '$var.index' }),
      injectionSource,
    )).toBeNull()
  })
})

describe('ElementEditSchema Tag Partial key', () => {
  const injectionSource = 'declare var $var: { index: number; };'

  it('accepts disabled, literal, and formula values', () => {
    expect(ElementEditSchema.validateTagPartialKey('', injectionSource)).toBeNull()
    expect(ElementEditSchema.validateTagPartialKey(
      JSON.stringify({ type: 'literal', value: 'task-3' }),
      injectionSource,
    )).toBeNull()
    expect(ElementEditSchema.validateTagPartialKey(
      JSON.stringify({ type: 'formula', source: '`task-${$var.index}`' }),
      injectionSource,
    )).toBeNull()
  })

  it('requires an enabled key without statically resolving its formula', () => {
    expect(ElementEditSchema.validateTagPartialKey(
      JSON.stringify({ type: 'literal', value: '' }),
      injectionSource,
    )).toBe('Enter a Partial key.')
    expect(ElementEditSchema.validateTagPartialKey(
      JSON.stringify({ type: 'formula', source: ' \n\t' }),
      injectionSource,
    )).toBe('Enter a Partial key formula.')
    expect(ElementEditSchema.validateTagPartialKey(
      JSON.stringify({ type: 'formula', source: '$var.index' }),
      injectionSource,
    )).toBeNull()
  })
})

describe('ElementEditSchema Tag attributes', () => {
  const literal = (type: 'attribute' | 'property', name: string) => ({
    type,
    name,
    value: { type: 'literal', value: '' },
  })
  const event = (name: string) => ({
    type: 'event',
    name,
    preventDefault: false,
    stopPropagation: false,
    action: { type: 'script', source: 'return' },
  })

  it('rejects duplicate attributes and properties in the same value namespace', () => {
    expect(ElementEditSchema.validateTagAttributes(JSON.stringify([
      literal('attribute', 'title'),
      literal('attribute', 'title'),
    ]))).toBe('Attribute, property, or event is duplicated.')

    expect(ElementEditSchema.validateTagAttributes(JSON.stringify([
      literal('attribute', 'value'),
      literal('property', 'value'),
    ]))).toBe('Attribute, property, or event is duplicated.')
  })

  it('rejects duplicate events and allows the same name in separate namespaces', () => {
    expect(ElementEditSchema.validateTagAttributes(JSON.stringify([
      event('click'),
      event('click'),
    ]))).toBe('Attribute, property, or event is duplicated.')

    expect(ElementEditSchema.validateTagAttributes(JSON.stringify([
      literal('attribute', 'click'),
      event('click'),
    ]))).toBeNull()
  })

  it('validates known number attributes for the selected tag', () => {
    expect(ElementEditSchema.validateTagAttributes(JSON.stringify([
      literal('attribute', 'tabindex'),
    ]), 'div')).toBe('Enter a number for tabindex.')

    expect(ElementEditSchema.validateTagAttributes(JSON.stringify([{
      type: 'attribute',
      name: 'tabindex',
      value: { type: 'literal', value: '-1' },
    }]), 'div')).toBeNull()

    expect(ElementEditSchema.validateTagAttributes(JSON.stringify([
      literal('attribute', 'custom-number-like-value'),
    ]), 'div')).toBeNull()
  })
})

describe('ElementEditSchema related text fields', () => {
  it('validates strict lowercase kebab identifiers by segment', () => {
    const textField: ElementEditSchema.TextField = {
      type: 'text',
      key: 'id',
      label: 'Id',
      charset: 'strictKebabIdentifier',
    }

    expect(ElementEditSchema.validateText(textField, 'app-v2')).toBeNull()
    expect(ElementEditSchema.validateText(textField, 'app-2'))
      .toBe('Use lowercase kebab-case. Start each segment with a letter.')
    expect(ElementEditSchema.validateText(textField, 'app--test'))
      .toBe('Use lowercase kebab-case. Start each segment with a letter.')
  })

  it('validates uppercase snake case constant identifiers', () => {
    const textField: ElementEditSchema.TextField = {
      type: 'text',
      key: 'id',
      label: 'Id',
      charset: 'constantIdentifier',
    }

    expect(ElementEditSchema.validateText(textField, 'PUZZLE_SIZE')).toBeNull()
    expect(ElementEditSchema.validateText(textField, 'GRID4_SIZE')).toBeNull()
    expect(ElementEditSchema.validateText(textField, 'GRID_4')).toBeNull()
    expect(ElementEditSchema.validateText(textField, 'puzzleSize'))
      .toBe('Use UPPER_SNAKE_CASE letters and numbers. Start with an uppercase letter.')
    expect(ElementEditSchema.validateText(textField, 'PUZZLE__SIZE'))
      .toBe('Use UPPER_SNAKE_CASE letters and numbers. Start with an uppercase letter.')
    expect(ElementEditSchema.validateText(textField, '_PUZZLE_SIZE'))
      .toBe('Use UPPER_SNAKE_CASE letters and numbers. Start with an uppercase letter.')
    expect(ElementEditSchema.validateText(textField, 'PUZZLE_SIZE_'))
      .toBe('Use UPPER_SNAKE_CASE letters and numbers. Start with an uppercase letter.')
  })

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
