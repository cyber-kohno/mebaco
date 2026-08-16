import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element'
import type TreeNode from '../../../tree/tree-node'
import TypeCatalog from './type-catalog'
import TypeExpression from './type-expression'
import ObjectShape from './object-shape'
import UnionDefinition from './union-definition'

let nextNodeId = 1

const node = (
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id: nextNodeId++,
  element,
  isOpen: true,
  children,
})

const property = (
  id: string,
  valueType: TypeExpression.Expression,
  options: Partial<Pick<TypeExpression.Property, 'optional' | 'nullable'>> = {},
): TypeExpression.Property => ({
  ...TypeExpression.createProperty(id, valueType),
  ...options,
})

const objectType = (
  typeId: string,
  id: string,
  properties: TypeExpression.Property[] = [],
  baseObjectIds: string[] = [],
) => node({ kind: 'object-type', typeId, id, baseObjectIds, properties })

const unionType = (
  typeId: string,
  id: string,
  definition: UnionDefinition.Definition,
) => node({ kind: 'union-type', typeId, id, definition })

const project = (
  commonObjects: TreeNode.Node[],
  appObjects: TreeNode.Node[] = [],
): TreeNode.Node => node({ kind: 'project' }, [
  node({ kind: 'common' }, [
    node({ kind: 'declares' }, [
      node({ kind: 'types' }, commonObjects),
    ]),
  ]),
  node({ kind: 'apps' }, [
    node({ kind: 'app', id: 'app' }, [
      node({ kind: 'declares' }, [
        node({ kind: 'types' }, appObjects),
      ]),
    ]),
  ]),
])

describe('TypeCatalog', () => {
  it('validates property names and duplicates per hierarchy level', () => {
    const valid = [
      property('name', { type: 'string' }),
      property('profile', TypeExpression.createObject([
        property('name', { type: 'string' }),
      ])),
    ]
    const duplicated = [
      property('name', { type: 'string' }),
      property('name', { type: 'number' }),
    ]

    expect(TypeExpression.validateProperties(valid)).toBeNull()
    expect(TypeExpression.validateProperties(duplicated)).toBe(
      'Property name is duplicated.',
    )
  })

  it('builds defaults through references and inline objects', () => {
    const address = objectType('address-type', 'Address', [
      property('city', { type: 'string' }),
    ])
    const user = objectType('user-type', 'User', [
      property('address', TypeExpression.createReference(['address-type'])),
      property('profile', TypeExpression.createObject([
        property('active', { type: 'boolean' }),
      ])),
      property('tags', TypeExpression.wrapArray({ type: 'string' }, 1)),
    ])
    const root = project([address, user])

    expect(TypeCatalog.createDefaultObject(root, 'user-type')).toEqual({
      address: { city: '' },
      profile: { active: false },
      tags: [],
    })
  })

  it('rejects direct and transitive circular references', () => {
    const first = objectType('first-type', 'First')
    const second = objectType('second-type', 'Second', [
      property('first', TypeExpression.createReference(['first-type'])),
    ])
    const root = project([first, second])

    expect(TypeCatalog.wouldCreateCycle(root, 'first-type', 'first-type')).toBe(true)
    expect(TypeCatalog.wouldCreateCycle(root, 'first-type', 'second-type')).toBe(true)
    expect(TypeCatalog.wouldCreateCycle(root, 'second-type', 'first-type')).toBe(false)
  })

  it('checks every Object member in a reference union for cycles', () => {
    const first = objectType('first-type', 'First')
    const second = objectType('second-type', 'Second')
    const third = objectType('third-type', 'Third', [
      property('targets', TypeExpression.createReference(['second-type', 'first-type'])),
    ])
    const root = project([first, second, third])

    expect(TypeCatalog.wouldCreateCycle(root, 'first-type', 'third-type')).toBe(true)
    expect(TypeCatalog.wouldCreateCycle(root, 'second-type', 'third-type')).toBe(true)
  })

  it('emits TypeScript declarations for named and inline objects', () => {
    const user = objectType('user-type', 'User', [
      property('name', { type: 'string' }),
      property('profile', TypeExpression.createObject([
        property('age', { type: 'number' }),
      ])),
    ])
    const root = project([user])

    expect(TypeCatalog.createTypeScriptDeclarations(root, user.id)).toContain(
      'profile: { age: number; };',
    )
  })

  it('supports optional, nullable, object union, and literal union properties', () => {
    const user = objectType('user-type', 'User')
    const admin = objectType('admin-type', 'Admin')
    const result = objectType('result-type', 'Result', [
      property('owner', TypeExpression.createReference(['user-type', 'admin-type'])),
      property('status', { type: 'string', literals: ['ready', 'done'] }),
      property('code', { type: 'number', literals: [200, 404] }, { optional: true }),
      property('parent', TypeExpression.createReference(['user-type']), { nullable: true }),
    ])
    const root = project([user, admin, result])
    const declarations = TypeCatalog.createTypeScriptDeclarations(root, result.id)

    expect(declarations).toContain('owner: User | Admin;')
    expect(declarations).toContain('status: "ready" | "done";')
    expect(declarations).toContain('code?: 200 | 404;')
    expect(declarations).toContain('parent: User | null;')
    expect(TypeCatalog.createDefaultObject(root, 'result-type')).toEqual({
      owner: {},
      status: 'ready',
      parent: null,
    })
  })

  it('merges Base Objects into defaults and TypeScript type aliases', () => {
    const identifiable = objectType('identifiable-type', 'Identifiable', [
      property('id', { type: 'string' }),
    ])
    const timestamped = objectType('timestamped-type', 'Timestamped', [
      property('createdAt', { type: 'number' }),
    ])
    const user = objectType('user-type', 'User', [
      property('name', { type: 'string' }),
    ], ['identifiable-type', 'timestamped-type'])
    const root = project([identifiable, timestamped, user])

    expect(TypeCatalog.createDefaultObject(root, 'user-type')).toEqual({
      id: '',
      createdAt: 0,
      name: '',
    })
    expect(TypeCatalog.createTypeScriptDeclarations(root, user.id)).toContain(
      'type User = Identifiable & Timestamped & {',
    )
  })

  it('emits TypeScript declarations for named unions', () => {
    const user = objectType('user-type', 'User')
    const admin = objectType('admin-type', 'Admin')
    const mode = unionType('mode-type', 'Mode', {
      type: 'literal',
      valueType: 'string',
      values: ['maintenance', 'refer'],
    })
    const result = unionType('result-type', 'Result', {
      type: 'object',
      objectTypeIds: ['user-type', 'admin-type'],
    })
    const root = project([user, admin, mode, result])
    const declarations = TypeCatalog.createTypeScriptDeclarations(root, result.id)

    expect(declarations).toContain('type Mode = "maintenance" | "refer"')
    expect(declarations).toContain('type Result = User | Admin')
  })

  it('uses named unions from value type references', () => {
    const mode = unionType('mode-type', 'Mode', {
      type: 'literal',
      valueType: 'string',
      values: ['maintenance', 'refer'],
    })
    const root = project([mode])
    const valueType = TypeExpression.createNamed('mode-type')

    expect(TypeExpression.getTypeText(
      valueType,
      (typeId) => TypeCatalog.resolveTypeName(root, typeId),
    )).toBe('Mode')
    expect(TypeCatalog.createDefaultNamedType(root, 'mode-type')).toBe('maintenance')
  })

  it('treats named unions used by State and Variable as active references', () => {
    const mode = unionType('mode-type', 'Mode', {
      type: 'literal',
      valueType: 'string',
      values: ['maintenance', 'refer'],
    })
    const root = project([
      mode,
      node({
        kind: 'state',
        id: 'mode',
        valueType: TypeExpression.createNamed('mode-type'),
        nullable: false,
        initial: { type: 'default' },
      }),
      node({
        kind: 'variable',
        id: 'currentMode',
        binding: 'const',
        typeSetting: {
          type: 'explicit',
          valueType: TypeExpression.createNamed('mode-type'),
          nullable: false,
        },
        source: '$state.mode',
      }),
    ])

    expect(TypeCatalog.isUnionReferenced(root, 'mode-type')).toBe(true)
  })

  it('treats Object references from named object unions as active references', () => {
    const user = objectType('user-type', 'User')
    const result = unionType('result-type', 'Result', {
      type: 'object',
      objectTypeIds: ['user-type'],
    })
    const root = project([user, result])

    expect(TypeCatalog.isObjectReferenced(root, 'user-type')).toBe(true)
  })

  it('rejects conflicting inherited and local properties', () => {
    const options: ObjectShape.ObjectOption[] = [{
      value: 'base-type',
      label: 'Base',
      baseObjectIds: [],
      properties: [property('id', { type: 'string' })],
    }]

    expect(ObjectShape.validate({
      baseObjectIds: ['base-type'],
      properties: [property('id', { type: 'number' })],
    }, options)).toBe('Local property "id" conflicts with a Base Object.')
  })
})
