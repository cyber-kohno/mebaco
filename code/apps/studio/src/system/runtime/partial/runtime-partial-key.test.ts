import { describe, expect, it } from 'vitest'
import FormulaContext from '../formula/formula-context'
import RuntimePartialKey from './runtime-partial-key'

describe('RuntimePartialKey', () => {
  it('resolves literal and Loop-variable formula keys', () => {
    expect(RuntimePartialKey.resolve(
      { type: 'literal', value: 'task-3' },
      FormulaContext.createEmpty(),
    )).toEqual({ key: 'task-3', error: null })

    expect(RuntimePartialKey.resolve(
      { type: 'formula', source: '`task-${$var.index}`' },
      FormulaContext.create({ $var: { index: 4 } }),
    )).toEqual({ key: 'task-4', error: null })
  })

  it('rejects empty and non-string results at runtime', () => {
    const empty = RuntimePartialKey.resolve(
      { type: 'formula', source: "''" },
      FormulaContext.createEmpty(),
    )
    const number = RuntimePartialKey.resolve(
      { type: 'formula', source: '1' },
      FormulaContext.createEmpty(),
    )

    expect(empty.error?.message).toBe('Partial key must not be empty.')
    expect(number.error?.message).toBe('Partial key formula must return a string.')
  })
})
