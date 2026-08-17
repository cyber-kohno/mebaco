import { describe, expect, it } from 'vitest'
import VariableFrame from './variable-frame'

describe('VariableFrame', () => {
  it('keeps child writes local and forks siblings from the same parent value', () => {
    const parent = VariableFrame.create({})
    parent.declare('color', 'let', '#ffe')
    const first = VariableFrame.create(parent.values)
    const second = VariableFrame.create(parent.values)

    first.values.color = '#fcc'

    expect(first.values.color).toBe('#fcc')
    expect(second.values.color).toBe('#ffe')
    expect(parent.values.color).toBe('#ffe')
  })

  it('rejects writes to inherited const bindings', () => {
    const parent = VariableFrame.create({})
    parent.declare('user', 'const', { id: 1 })
    const child = VariableFrame.create(parent.values)

    expect(() => {
      child.values.user = { id: 2 }
    }).toThrow("Variable 'user' is readonly.")
  })

  it('allows a child declaration to shadow an inherited binding', () => {
    const parent = VariableFrame.create({})
    parent.declare('index', 'const', 'outer')
    const child = VariableFrame.create(parent.values)

    child.declare('index', 'const', 0)

    expect(child.values.index).toBe(0)
    expect(parent.values.index).toBe('outer')
  })
})
