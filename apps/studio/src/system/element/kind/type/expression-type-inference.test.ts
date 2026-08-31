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

  it('infers and validates the resolved value of an awaited Promise', () => {
    const asyncInjection = [
      'interface User { id: string; }',
      'declare var $fn: { load(): Promise<User>; };',
    ].join('\n')

    expect(ExpressionTypeInference.inferType(
      asyncInjection,
      'await $fn.load()',
      false,
      true,
    )).toEqual({ ok: true, typeText: 'User' })
    expect(ExpressionTypeInference.validateExpectedType(
      asyncInjection,
      'await $fn.load()',
      'User',
      true,
    )).toBeNull()
    expect(ExpressionTypeInference.validateExpectedType(
      asyncInjection,
      'await $fn.load()',
      'number',
      true,
    )).toBe('Expression must return number.')
  })
})
