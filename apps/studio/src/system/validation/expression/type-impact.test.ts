import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
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

  it('treats Variable mutability as a reference contract change', () => {
    const previous = element({
      kind: 'variable',
      id: 'value',
      binding: 'let',
      typeSetting: { type: 'inferred' },
      source: '1',
    })
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      binding: 'const',
    }))).toBe(true)
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

  it.each([
    {
      kind: 'object-type', typeId: 'object-uuid', id: 'User',
      baseObjectIds: [], properties: [],
    },
    {
      kind: 'union-type', typeId: 'union-uuid', id: 'Status',
      definition: { type: 'literal', valueType: 'string', values: ['ready'] },
    },
    {
      kind: 'signature-type', typeId: 'signature-uuid', id: 'Handler',
      async: false, parameters: [], returnType: { type: 'void' },
    },
  ])('does not treat a $kind Id rename as a type contract change', (previous) => {
    expect(TypeImpact.hasChanged(element(previous), element({
      ...previous,
      id: `Renamed${previous.id}`,
    }))).toBe(false)
  })

  it('detects Launch Argument contract changes but ignores default contents', () => {
    const previous = element({
      kind: 'launch-argument', propId: 'argument-uuid', id: 'mode',
      valueType: { type: 'string' }, nullable: false,
      defaultValue: { type: 'literal', value: 'view' },
    })
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      defaultValue: { type: 'literal', value: 'edit' },
    }))).toBe(false)
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      defaultValue: undefined,
    }))).toBe(true)
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      nullable: true,
    }))).toBe(true)
  })

  it('does not treat a Switch value type as a project-wide type contract', () => {
    const previous = element({
      kind: 'switch',
      valueType: { type: 'primitive', primitive: 'string' },
      source: '$state.status',
    })

    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      valueType: { type: 'primitive', primitive: 'number' },
    }))).toBe(false)
  })

  it('ignores a Signature Parameter rename but detects positional and type changes', () => {
    const first = {
      parameterId: 'first-id', id: 'first', valueType: { type: 'string' as const }, nullable: false,
    }
    const second = {
      parameterId: 'second-id', id: 'second', valueType: { type: 'number' as const }, nullable: false,
    }
    const previous = element({
      kind: 'signature-type', typeId: 'signature-id', id: 'Handler',
      async: false, parameters: [first, second], returnType: null,
    })

    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      parameters: [{ ...first, id: 'renamed' }, second],
    }))).toBe(false)
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      parameters: [second, first],
    }))).toBe(true)
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      parameters: [{ ...first, valueType: { type: 'number' } }, second],
    }))).toBe(true)
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      parameters: [first],
    }))).toBe(true)
    expect(TypeImpact.hasChanged(previous, element({
      ...previous,
      parameters: [first, second, {
        parameterId: 'third-id', id: 'third',
        valueType: { type: 'boolean' }, nullable: false,
      }],
    }))).toBe(true)
  })
})
