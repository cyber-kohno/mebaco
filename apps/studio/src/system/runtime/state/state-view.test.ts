import { describe, expect, it } from 'vitest'
import ExecutionPolicy from '../execution-policy'
import StateView from './state-view'

const mutable = ExecutionPolicy.create('mutable', 'event', 10)
const readonly = ExecutionPolicy.create('readonly', 'retention', 20)

describe('StateView', () => {
  it('allows reads and preserves identity inside one policy', () => {
    const object = { value: 1 }
    const state = StateView.create({ first: object, second: object }, readonly)

    expect(state.first.value).toBe(1)
    expect(state.first).toBe(state.first)
    expect(state.first).toBe(state.second)
  })

  it('rejects root and deep writes before changing the target', () => {
    const target = { count: 1, data: { count: 2 } }
    const state = StateView.create(target, readonly)

    expect(() => { state.count = 1 })
      .toThrow("State '$state.count' cannot be updated during retention evaluation")
    expect(() => { state.data.count = 3 })
      .toThrow("State '$state.data.count' cannot be updated during retention evaluation")
    expect(target).toEqual({ count: 1, data: { count: 2 } })
  })

  it('rejects array and object mutation operations', () => {
    const target: { items: number[]; data: Record<string, number> } = {
      items: [2, 1],
      data: { value: 1 },
    }
    const state = StateView.create(target, readonly)

    expect(() => state.items.push(3)).toThrow('cannot be updated')
    expect(() => state.items.splice(0, 1)).toThrow('cannot be updated')
    expect(() => state.items.sort()).toThrow('cannot be updated')
    expect(() => { delete state.data.value }).toThrow('cannot be updated')
    expect(() => Object.assign(state.data, { next: 2 })).toThrow('cannot be updated')
    expect(() => Object.defineProperty(state.data, 'next', { value: 2 }))
      .toThrow('cannot be updated')
    expect(() => Object.setPrototypeOf(state.data, null)).toThrow('cannot be updated')
    expect(() => Object.preventExtensions(state.data)).toThrow('cannot be updated')
    expect(target).toEqual({ items: [2, 1], data: { value: 1 } })
  })

  it('allows the same operations through a mutable view', () => {
    const target: { count: number; data: Record<string, number>; items: number[] } = {
      count: 1,
      data: {},
      items: [],
    }
    const state = StateView.create(target, mutable)

    state.count = 2
    state.data.value = 3
    state.items.push(4)

    expect(target).toEqual({ count: 2, data: { value: 3 }, items: [4] })
  })

  it('rejects object descriptors and prototypes that break the State membrane', () => {
    const state = StateView.create({ data: {} }, mutable)

    expect(() => Object.defineProperty(state.data, 'value', { value: {} }))
      .toThrow('cannot use a non-configurable object value')
    expect(() => Object.setPrototypeOf(state.data, { custom: true }))
      .toThrow('cannot use a custom prototype')
  })

  it('rebinds aliases between mutable and readonly policies', () => {
    const target = { data: { value: 1 }, alias: null as { value: number } | null }
    const writable = StateView.create(target, mutable)
    writable.alias = writable.data
    const guarded = StateView.create(writable, readonly)

    expect(guarded.alias).toBe(guarded.data)
    expect(() => { guarded.alias!.value = 2 }).toThrow('cannot be updated')
    expect(target.data.value).toBe(1)

    const rebound = StateView.rebind(guarded.data, mutable)
    rebound.value = 2
    expect(target.data.value).toBe(2)
  })

  it('rebinds State aliases exposed by a namespace', () => {
    const target = { data: { value: 1 } }
    const guarded = StateView.create(target, readonly)
    const variables = StateView.rebindNamespace({
      data: guarded.data,
      nested: { data: guarded.data },
    }, mutable)

    variables.data.value = 2
    variables.nested.data.value = 3

    expect(target.data.value).toBe(3)
  })

  it('supports cyclic plain state values', () => {
    const target: { self?: unknown } = {}
    target.self = target
    const state = StateView.create(target, readonly)

    expect(state.self).toBe(state)
  })

  it('rejects mutable values that cannot be safely wrapped', () => {
    const state = StateView.create({ date: new Date() }, readonly)

    expect(() => state.date).toThrow("contains unsupported mutable value 'Date'")
  })
})
