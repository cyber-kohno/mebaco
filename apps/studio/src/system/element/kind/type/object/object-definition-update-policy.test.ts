import { describe, expect, it } from 'vitest'
import type TreeNode from '../../../../tree/tree-node'
import TypeExpression from '../type-expression'
import type ObjectTypeElement from './object-type-element'
import ObjectDefinitionUpdatePolicy from './object-definition-update-policy'

const node = (
  id: number,
  element: Record<string, unknown>,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children,
})

const property = (
  propertyId: string,
  id: string,
  valueType: TypeExpression.Expression = TypeExpression.createPrimitive(),
): TypeExpression.Property => TypeExpression.createProperty(id, valueType, propertyId)

const objectType = (
  typeId: string,
  id: string,
  properties: TypeExpression.Property[] = [],
  baseObjectIds: string[] = [],
): ObjectTypeElement.Element => ({
  kind: 'object-type', typeId, id, properties, baseObjectIds,
})

describe('ObjectDefinitionUpdatePolicy', () => {
  it('collects recursive member additions, removals, updates, and renames', () => {
    const previous = objectType('user-type', 'User', [
      property('name-id', 'name'),
      property('address-id', 'address', TypeExpression.createObject([
        property('city-id', 'city'),
        property('removed-id', 'removed'),
      ])),
    ])
    const current = objectType('user-type', 'User', [
      property('name-id', 'displayName'),
      property('address-id', 'address', TypeExpression.createObject([
        {
          ...property('city-id', 'city', TypeExpression.createPrimitive('number')),
          nullable: true,
        },
        property('added-id', 'added'),
      ])),
    ])
    const root = node(1, { kind: 'project' }, [node(2, previous)])

    const result = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    expect(result.renamed).toEqual([{
      propertyId: 'name-id', previousPath: 'name', currentPath: 'displayName',
    }])
    expect(result.added).toEqual([{
      propertyId: 'added-id', currentPath: 'address.added',
    }])
    expect(result.removed).toEqual([{
      propertyId: 'removed-id', previousPath: 'address.removed',
    }])
    expect(result.updated).toEqual([{
      propertyId: 'city-id', previousPath: 'address.city', currentPath: 'address.city',
    }])
    expect(result.effectiveShapeChanged).toBe(true)
    expect(result.notices).toEqual([
      'Object members changed: 1 added / 1 removed / 1 updated / 1 renamed.',
      'Renamed: User.name -> User.displayName',
    ])
  })

  it('treats Property order as non-semantic', () => {
    const first = property('first-id', 'first')
    const second = property('second-id', 'second')
    const previous = objectType('item-type', 'Item', [first, second])
    const current = objectType('item-type', 'Item', [second, first])
    const root = node(1, { kind: 'project' }, [node(2, previous)])

    const result = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    expect(result.effectiveShapeChanged).toBe(false)
    expect(result.added).toEqual([])
    expect(result.removed).toEqual([])
    expect(result.updated).toEqual([])
    expect(result.renamed).toEqual([])
    expect(result.notices).toEqual([])
  })

  it('detects inherited effective Shape changes from Base Object selection', () => {
    const base = objectType('base-type', 'Base', [property('base-id', 'baseValue')])
    const previous = objectType('item-type', 'Item')
    const current = objectType('item-type', 'Item', [], ['base-type'])
    const root = node(1, { kind: 'project' }, [node(2, base), node(3, previous)])

    const result = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    expect(result.effectiveAddedPaths).toEqual(['baseValue'])
    expect(result.effectiveShapeChanged).toBe(true)
    expect(result.notices).toEqual([
      'Effective Object shape changed: 1 added.',
    ])
  })

  it('does not treat replacement with an equivalent Base Shape as a contract change', () => {
    const firstBase = objectType('first-base', 'FirstBase', [
      property('first-value-id', 'value'),
    ])
    const secondBase = objectType('second-base', 'SecondBase', [
      property('second-value-id', 'value'),
    ])
    const previous = objectType('item-type', 'Item', [], ['first-base'])
    const current = objectType('item-type', 'Item', [], ['second-base'])
    const root = node(1, { kind: 'project' }, [
      node(2, firstBase), node(3, secondBase), node(4, previous),
    ])

    const result = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    expect(result.effectiveShapeChanged).toBe(false)
    expect(result.notices).toEqual([
      'Base Objects changed without changing the effective Object shape.',
    ])
  })

  it('rejects equal inherited contracts owned by different Properties', () => {
    const firstBase = objectType('first-base', 'FirstBase', [
      property('first-value-id', 'value'),
    ])
    const secondBase = objectType('second-base', 'SecondBase', [
      property('second-value-id', 'value'),
    ])
    const previous = objectType('item-type', 'Item')
    const current = objectType('item-type', 'Item', [], ['first-base', 'second-base'])
    const root = node(1, { kind: 'project' }, [
      node(2, firstBase), node(3, secondBase), node(4, previous),
    ])

    expect(() => ObjectDefinitionUpdatePolicy.analyze(root, previous, current))
      .toThrow('Inherited property "value" conflicts.')
  })

  it('accepts one inherited Property reached through a diamond', () => {
    const shared = objectType('shared-base', 'SharedBase', [
      property('shared-value-id', 'value'),
    ])
    const firstBase = objectType('first-base', 'FirstBase', [], ['shared-base'])
    const secondBase = objectType('second-base', 'SecondBase', [], ['shared-base'])
    const previous = objectType('item-type', 'Item')
    const current = objectType('item-type', 'Item', [], ['first-base', 'second-base'])
    const root = node(1, { kind: 'project' }, [
      node(2, shared), node(3, firstBase), node(4, secondBase), node(5, previous),
    ])

    const result = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    expect(result.effectiveAddedPaths).toEqual(['value'])
    expect(result.effectiveShapeChanged).toBe(true)
  })

  it.each([
    {
      label: 'swaps existing names',
      previous: [property('first-id', 'first'), property('second-id', 'second')],
      current: [property('first-id', 'second'), property('second-id', 'first')],
    },
    {
      label: 'reuses a removed name for a new identity',
      previous: [property('first-id', 'value')],
      current: [property('replacement-id', 'value')],
    },
    {
      label: 'reuses a nested name for a new identity',
      previous: [property('owner-id', 'owner', TypeExpression.createObject([
        property('nested-id', 'value'),
      ]))],
      current: [property('owner-id', 'owner', TypeExpression.createObject([
        property('replacement-id', 'value'),
      ]))],
    },
  ])('rejects when it $label', ({ previous: before, current: after }) => {
    const previous = objectType('item-type', 'Item', before)
    const current = objectType('item-type', 'Item', after)
    const root = node(1, { kind: 'project' }, [node(2, previous)])

    expect(() => ObjectDefinitionUpdatePolicy.analyze(root, previous, current))
      .toThrow(ObjectDefinitionUpdatePolicy.PropertyNameReuseError)
  })
})
