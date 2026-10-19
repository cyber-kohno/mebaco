import { describe, expect, it } from 'vitest'
import EffectDependencyChange from './effect-dependency-change'

describe('EffectDependencyChange', () => {
  it('detects the initial dependency evaluation, including an empty list', () => {
    expect(EffectDependencyChange.detected(null, [])).toBe(true)
  })

  it('does not detect a change when dependency values stay equal', () => {
    const reference = { id: 1 }

    expect(EffectDependencyChange.detected([1, reference], [1, reference])).toBe(false)
  })

  it('detects changed values and dependency list lengths', () => {
    expect(EffectDependencyChange.detected([1], [2])).toBe(true)
    expect(EffectDependencyChange.detected([], [1])).toBe(true)
  })
})
