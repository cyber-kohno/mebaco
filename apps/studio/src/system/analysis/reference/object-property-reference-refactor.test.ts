import { describe, expect, it } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import TypeExpression from '../../element/kind/type/type-expression'
import type ObjectTypeElement from '../../element/kind/type/object/object-type-element'
import ObjectDefinitionUpdatePolicy from '../../element/kind/type/object/object-definition-update-policy'
import ObjectPropertyReferenceRefactor from './object-property-reference-refactor'

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

const state = (
  id: string,
  objectTypeIds: string[],
): Record<string, unknown> => ({
  kind: 'state', id,
  valueType: { type: 'reference', objectTypeIds },
  nullable: false,
  initial: { type: 'default' },
})

const getSource = (root: TreeNode.Node, nodeId: number): string => {
  const find = (current: TreeNode.Node): TreeNode.Node | null => {
    if (current.id === nodeId) return current
    for (const child of current.children) {
      const found = find(child)
      if (found != null) return found
    }
    return null
  }
  return (find(root)?.element as { source: string }).source
}

describe('ObjectPropertyReferenceRefactor', () => {
  it('resolves an inherited Property to its defining UUID', () => {
    const inherited = property('name-property', 'name')
    const previous = objectType('base-type', 'Base', [inherited])
    const current = objectType('base-type', 'Base', [{ ...inherited, id: 'displayName' }])
    const derived = objectType('derived-type', 'Derived', [], ['base-type'])
    const expression = node(8, {
      kind: 'action', comment: '', source: '$state.item.name',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous), node(3, derived), node(4, state('item', ['derived-type'])), expression,
    ])
    const analysis = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    const result = ObjectPropertyReferenceRefactor.apply(root, analysis)

    expect(getSource(result.rootNode, expression.id)).toBe('$state.item.displayName')
    expect(result.changedNodeIds).toEqual([expression.id])
    expect(result.updatedOccurrenceCount).toBe(1)
  })

  it('resolves a nested inline Object Property UUID', () => {
    const city = property('city-property', 'city')
    const profile = property(
      'profile-property',
      'profile',
      TypeExpression.createObject([city]),
    )
    const previous = objectType('user-type', 'User', [profile])
    const current = objectType('user-type', 'User', [{
      ...profile,
      valueType: TypeExpression.createObject([{ ...city, id: 'cityName' }]),
    }])
    const expression = node(8, {
      kind: 'action', comment: '', source: '$state.user.profile.city',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous), node(3, state('user', ['user-type'])), expression,
    ])
    const analysis = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    const result = ObjectPropertyReferenceRefactor.apply(root, analysis)

    expect(getSource(result.rootNode, expression.id)).toBe('$state.user.profile.cityName')
    expect(result.updatedOccurrenceCount).toBe(1)
  })

  it('rewrites formulas stored inside JSON editor values', () => {
    const name = property('name-property', 'name')
    const previous = objectType('user-type', 'User', [name])
    const current = objectType('user-type', 'User', [{ ...name, id: 'displayName' }])
    const formulaNode = node(8, {
      kind: 'tag', id: 'div',
      attributes: JSON.stringify([{
        id: 'title',
        value: { type: 'formula', source: '$state.user.name' },
      }]),
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous), node(3, state('user', ['user-type'])), formulaNode,
    ])
    const analysis = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    const result = ObjectPropertyReferenceRefactor.apply(root, analysis)
    const attributes = JSON.parse(
      (result.rootNode.children.find((child) => child.id === formulaNode.id)?.element as unknown as {
        attributes: string
      }).attributes,
    ) as Array<{ value: { source: string } }>

    expect(attributes[0].value.source).toBe('$state.user.displayName')
    expect(result.changedNodeIds).toEqual([formulaNode.id])
    expect(result.updatedOccurrenceCount).toBe(1)
  })

  it('does not rewrite an ambiguous structural Union Property', () => {
    const firstName = property('first-name-property', 'name')
    const secondName = property('second-name-property', 'name')
    const previous = objectType('first-type', 'First', [firstName])
    const current = objectType('first-type', 'First', [{ ...firstName, id: 'displayName' }])
    const second = objectType('second-type', 'Second', [secondName])
    const expression = node(8, {
      kind: 'action', comment: '', source: '$state.item.name',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous), node(3, second),
      node(4, state('item', ['first-type', 'second-type'])), expression,
    ])
    const analysis = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    const result = ObjectPropertyReferenceRefactor.apply(root, analysis)

    expect(getSource(result.rootNode, expression.id)).toBe('$state.item.name')
    expect(result.changedNodeIds).toEqual([])
    expect(result.updatedOccurrenceCount).toBe(0)
  })

  it('does not rewrite dynamic or any-typed access', () => {
    const name = property('name-property', 'name')
    const previous = objectType('user-type', 'User', [name])
    const current = objectType('user-type', 'User', [{ ...name, id: 'displayName' }])
    const expression = node(8, {
      kind: 'action', comment: '',
      source: "const key = 'name'; $state.user[key]; ($state.user as any).name",
    })
    const root = node(1, { kind: 'project' }, [
      node(2, previous), node(3, state('user', ['user-type'])), expression,
    ])
    const analysis = ObjectDefinitionUpdatePolicy.analyze(root, previous, current)

    const result = ObjectPropertyReferenceRefactor.apply(root, analysis)

    expect(getSource(result.rootNode, expression.id))
      .toBe("const key = 'name'; $state.user[key]; ($state.user as any).name")
    expect(result.updatedOccurrenceCount).toBe(0)
  })
})
