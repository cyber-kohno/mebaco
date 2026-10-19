import { describe, expect, it } from 'vitest'
import FormulaLabelState from './formula-label-state'

describe('FormulaLabelState', () => {
  it('treats a blank formula as an error without waiting for diagnostics', () => {
    expect(FormulaLabelState.resolve('', undefined, null)).toEqual({
      status: 'error',
      displayText: 'No formula entered',
      placeholder: true,
      message: 'No formula entered.',
    })
  })

  it('distinguishes checking, verified, and diagnostic error states', () => {
    expect(FormulaLabelState.resolve('value', undefined, null).status).toBe('checking')
    expect(FormulaLabelState.resolve('value', undefined, []).status).toBe('verified')
    expect(FormulaLabelState.resolve('value', undefined, ['Unknown name.'])).toMatchObject({
      status: 'error',
      message: 'Unknown name.',
    })
  })

  it('prioritizes an external field validation error', () => {
    expect(FormulaLabelState.resolve('value', 'Formula is too long.', [])).toMatchObject({
      status: 'error',
      message: 'Formula is too long.',
    })
  })
})
