import { describe, expect, it } from 'vitest'
import TypeDefaultLabel from './type-default-label'
import TypeExpression from './type-expression'
import ValueTypeDefinition from './value-type-definition'

const definition = (
  valueType: TypeExpression.Expression,
  nullable = false,
): ValueTypeDefinition.Definition => ({ valueType, nullable })

const resolver: TypeDefaultLabel.Resolver = {
  resolveObjectName: (typeId) => ({
    user: 'User',
    profile: 'Profile',
  })[typeId],
  resolveNamedType: (typeId) => {
    switch (typeId) {
      case 'status':
        return {
          kind: 'union',
          typeId,
          name: 'Status',
          definition: { type: 'literal', valueType: 'string', values: ['standby', 'ready'] },
        }
      case 'priority':
        return {
          kind: 'union',
          typeId,
          name: 'Priority',
          definition: { type: 'literal', valueType: 'number', values: [-1, 0] },
        }
      case 'account':
        return {
          kind: 'union',
          typeId,
          name: 'Account',
          definition: { type: 'object', objectTypeIds: ['user', 'profile'] },
        }
      case 'on-complete':
        return {
          kind: 'signature',
          typeId,
          name: 'OnComplete',
          definition: {
            async: false,
            parameters: [
              { parameterId: 'id-parameter', id: 'id', valueType: { type: 'number' }, nullable: false },
              { parameterId: 'name-parameter', id: 'name', valueType: { type: 'string' }, nullable: false },
            ],
            returnType: null,
          },
        }
      case 'load-user':
        return {
          kind: 'signature',
          typeId,
          name: 'LoadUser',
          definition: {
            async: true,
            parameters: [],
            returnType: definition(TypeExpression.createReference(['user'])),
          },
        }
      case 'get-name':
        return {
          kind: 'signature',
          typeId,
          name: 'GetName',
          definition: {
            async: false,
            parameters: [],
            returnType: definition(TypeExpression.createPrimitive('string')),
          },
        }
      case 'get-status':
        return {
          kind: 'signature',
          typeId,
          name: 'GetStatus',
          definition: {
            async: false,
            parameters: [],
            returnType: definition(TypeExpression.createNamed('status')),
          },
        }
      case 'recursive':
        return {
          kind: 'signature',
          typeId,
          name: 'Recursive',
          definition: {
            async: false,
            parameters: [],
            returnType: definition(TypeExpression.createNamed('recursive', 'signature')),
          },
        }
      default:
        return undefined
    }
  },
}

const get = (
  valueType: TypeExpression.Expression,
  nullable = false,
): string | undefined => TypeDefaultLabel.get(definition(valueType, nullable), resolver)

describe('TypeDefaultLabel', () => {
  it.each<[TypeExpression.Expression, string]>([
    [{ type: 'string' }, "''"],
    [{ type: 'number' }, '0'],
    [{ type: 'boolean' }, 'false'],
    [{ type: 'string', literals: ['standby', 'ready'] }, "'standby'"],
    [{ type: 'number', literals: [-1, 0] }, '-1'],
  ])('formats primitive defaults', (valueType, expected) => {
    expect(get(valueType)).toBe(expected)
  })

  it('formats nullable and array defaults before their base types', () => {
    expect(get(TypeExpression.createPrimitive('string'), true)).toBe('null')
    expect(get(TypeExpression.wrapArray(TypeExpression.createPrimitive('number'), 2))).toBe('[]')
    expect(get(TypeExpression.wrapArray(TypeExpression.createPrimitive('number'), 1), true)).toBe('null')
  })

  it('formats inline, referenced, and object-union defaults', () => {
    expect(get(TypeExpression.createObject())).toBe('Object(default)')
    expect(get(TypeExpression.createReference(['user']))).toBe('User(default)')
    expect(get(TypeExpression.createNamed('account'))).toBe('User(default)')
  })

  it('formats literal-union defaults from the first candidate', () => {
    expect(get(TypeExpression.createNamed('status'))).toBe("'standby'")
    expect(get(TypeExpression.createNamed('priority'))).toBe('-1')
  })

  it('formats synchronous and asynchronous signature defaults', () => {
    expect(get(TypeExpression.createNamed('on-complete', 'signature')))
      .toBe('(id, name) => {}')
    expect(get(TypeExpression.createNamed('load-user', 'signature')))
      .toBe('async () => User(default)')
    expect(get(TypeExpression.createNamed('get-name', 'signature')))
      .toBe("() => ''")
    expect(get(TypeExpression.createNamed('get-status', 'signature')))
      .toBe("() => 'standby'")
  })

  it('falls back to the signature name when definitions are recursive', () => {
    expect(get(TypeExpression.createNamed('recursive', 'signature')))
      .toBe('() => Recursive(default)')
  })

  it('escapes string literal labels for readability', () => {
    expect(get({ type: 'string', literals: ["it's\nready"] }))
      .toBe("'it\\'s\\nready'")
  })
})
