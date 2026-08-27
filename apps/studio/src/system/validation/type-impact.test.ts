import { describe, expect, it } from 'vitest'
import type MebacoElement from '../element/element'
import TypeImpact from './type-impact'

const element = (value: Record<string, unknown>): MebacoElement.Element => (
  value as MebacoElement.Element
)

describe('TypeImpact', () => {
  it('detects state value type changes but ignores initial value changes', () => {
    const previous = element({
      kind: 'state',
      id: 'count',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'literal', value: 1 },
    })

    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      initial: { type: 'literal', value: 2 },
    }))).toBe(false)
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      valueType: { type: 'string' },
    }))).toBe(true)
  })

  it('treats an inferred Variable source as type-affecting', () => {
    const previous = element({
      kind: 'variable',
      id: 'value',
      binding: 'const',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      source: "'text'",
    }))).toBe(true)
  })

  it('does not treat an explicitly typed Variable source as a type change', () => {
    const previous = element({
      kind: 'variable',
      id: 'value',
      binding: 'const',
      typeSetting: {
        type: 'explicit',
        valueType: { type: 'number' },
        nullable: false,
      },
      source: '1',
    })
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      source: '2',
    }))).toBe(false)
  })

  it('detects named type definition changes', () => {
    const previous = element({
      kind: 'union-type',
      typeId: 'type-uuid',
      id: 'Status',
      definition: { type: 'literal', valueType: 'string', values: ['ready'] },
    })
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      definition: { type: 'literal', valueType: 'string', values: ['ready', 'done'] },
    }))).toBe(true)
  })
})
