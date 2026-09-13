import { describe, expect, it } from 'vitest'
import TextElement from './text-element'

describe('TextElement', () => {
  it('stores literal and formula text with the shared resolvable value shape', () => {
    expect(TextElement.createLiteral('Hello')).toEqual({
      kind: 'text',
      source: { type: 'literal', value: 'Hello' },
    })
    expect(TextElement.createFormula('$state.title')).toEqual({
      kind: 'text',
      source: { type: 'formula', source: '$state.title' },
    })
  })

  it('edits Text through one compact source field', () => {
    const schema = TextElement.createSchema()
    expect(schema.fields).toEqual([{
      type: 'textSource',
      key: 'source',
      label: 'Text',
      defaultValue: JSON.stringify({ type: 'literal', value: '' }),
      maxLiteralLength: 200,
      maxFormulaLength: 4000,
    }])

    const formula = TextElement.createFormula('$state.title')
    const values = schema.getInitialValues(formula)
    expect(values).toEqual({
      source: JSON.stringify({ type: 'formula', source: '$state.title' }),
    })
    expect(schema.update(formula, {
      source: JSON.stringify({ type: 'literal', value: 'Updated' }),
    })).toEqual(TextElement.createLiteral('Updated'))
  })

  it('rejects the removed plain and formula-value shapes', () => {
    expect(TextElement.parseSource(JSON.stringify({ type: 'plain', value: 'Legacy' }))).toBeNull()
    expect(TextElement.parseSource(JSON.stringify({ type: 'formula', value: '$state.title' }))).toBeNull()
  })
})
