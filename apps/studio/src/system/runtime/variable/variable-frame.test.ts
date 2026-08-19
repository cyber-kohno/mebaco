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

  it('propagates linked child writes to an inherited let binding', () => {
    const parent = VariableFrame.create({})
    parent.declare('count', 'let', 1)
    const child = VariableFrame.createLinked(parent.values)

    child.values.count = 2

    expect(child.values.count).toBe(2)
    expect(parent.values.count).toBe(2)
  })

  it('preserves const protection and local shadowing in linked frames', () => {
    const parent = VariableFrame.create({})
    parent.declare('value', 'const', 'outer')
    const child = VariableFrame.createLinked(parent.values)

    expect(() => {
      child.values.value = 'invalid'
    }).toThrow("Variable 'value' is readonly.")

    child.declare('value', 'let', 'local')
    child.values.value = 'changed'
    expect(child.values.value).toBe('changed')
    expect(parent.values.value).toBe('outer')
  })

  it('preserves effective bindings when a snapshot is forked from a linked frame', () => {
    const root = VariableFrame.create({})
    root.declare('mutable', 'let', 1)
    const linked = VariableFrame.createLinked(root.values)
    linked.declare('readonly', 'const', 2)
    const snapshot = VariableFrame.create(linked.values)

    snapshot.values.mutable = 3
    expect(snapshot.values.mutable).toBe(3)
    expect(root.values.mutable).toBe(1)
    expect(() => {
      snapshot.values.readonly = 4
    }).toThrow("Variable 'readonly' is readonly.")
  })
})
