import { describe, expect, it } from 'vitest'
import ExpressionTypeInference from './expression-type-inference'

describe('ExpressionTypeInference.validateExpectedType', () => {
  const injection = 'declare var $state: { count: number; label: string; };'

  it('accepts compatible expressions', () => {
    expect(ExpressionTypeInference.validateExpectedType(injection, "'ok'", 'string')).toBeNull()
    expect(ExpressionTypeInference.validateExpectedType(injection, '$state.count', 'number')).toBeNull()
  })

  it('rejects incompatible expressions', () => {
    expect(ExpressionTypeInference.validateExpectedType(injection, '$state.count', 'string'))
      .toBe('Expression must return string.')
  })
})
