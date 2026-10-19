import { describe, expect, it } from 'vitest'
import FormulaContext from '../formula/formula-context'
import RuntimeRefKey from './runtime-ref-key'

describe('RuntimeRefKey', () => {
  it('resolves a literal key', () => {
    expect(RuntimeRefKey.resolve(
      { type: 'literal', value: 'sidePanel' },
      FormulaContext.createEmpty(),
    )).toEqual({ key: 'sidePanel', error: null })
  })

  it('resolves a formula with Loop variables', () => {
    const result = RuntimeRefKey.resolve(
      { type: 'formula', source: '`recordFrame${$var.index}`' },
      FormulaContext.create({ $var: { index: 3 } }),
    )

    expect(result).toEqual({ key: 'recordFrame3', error: null })
  })

  it('rejects empty and non-string results', () => {
    const empty = RuntimeRefKey.resolve(
      { type: 'formula', source: "''" },
      FormulaContext.createEmpty(),
    )
    const number = RuntimeRefKey.resolve(
      { type: 'formula', source: '1' },
      FormulaContext.createEmpty(),
    )

    expect(empty.error?.message).toBe('Ref key must not be empty.')
    expect(number.error?.message).toBe('Ref key formula must return a string.')
  })
})
