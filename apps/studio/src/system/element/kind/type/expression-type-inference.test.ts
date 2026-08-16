import { describe, expect, it } from 'vitest'
import ExpressionTypeInference from './expression-type-inference'

const injectionSource = [
  'type User = { name: string; enabled: boolean; };',
  'declare var $state: { users: User[]; count: number; };',
].join('\n')

describe('ExpressionTypeInference', () => {
  it('infers an Object item from a declared State array', () => {
    expect(ExpressionTypeInference.inferArrayItem(
      injectionSource,
      '$state.users',
    )).toEqual({ ok: true, itemTypeText: 'User' })
  })

  it('preserves and transforms item types through common array methods', () => {
    expect(ExpressionTypeInference.inferArrayItem(
      injectionSource,
      '$state.users.filter((user) => user.enabled)',
    )).toEqual({ ok: true, itemTypeText: 'User' })
    expect(ExpressionTypeInference.inferArrayItem(
      injectionSource,
      '$state.users.map((user) => user.name)',
    )).toEqual({ ok: true, itemTypeText: 'string' })
  })

  it('rejects expressions that do not return arrays', () => {
    expect(ExpressionTypeInference.inferArrayItem(
      injectionSource,
      '$state.count',
    )).toEqual({ ok: false, error: 'Collection must return an array.' })
  })

  it('widens primitive literals for mutable Variable bindings', () => {
    expect(ExpressionTypeInference.inferType('', '1')).toEqual({
      ok: true,
      typeText: '1',
    })
    expect(ExpressionTypeInference.inferType('', '1', true)).toEqual({
      ok: true,
      typeText: 'number',
    })
  })
})
