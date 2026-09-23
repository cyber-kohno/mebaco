import { describe, expect, it } from 'vitest'
import StyleArgumentContract from './style-argument-contract'
import type StyleParameterCatalog from './style-parameter-catalog'

const parameter = (
  id: string,
  defaultValue?: string | number | boolean,
): StyleParameterCatalog.Parameter => ({
  parameterId: `parameter:${id}`,
  id,
  valueType: typeof defaultValue === 'number' ? 'number' : 'string',
  defaultValue,
  sourceStyleId: 'style:base',
  sourceStyleName: 'base',
  sourcePath: ['base'],
})

describe('StyleArgumentContract', () => {
  it('creates explicit arguments for inheritance and application usage', () => {
    const parameters = [parameter('width', 10), parameter('label')]

    expect(StyleArgumentContract.createArguments(parameters, 'inheritance')).toEqual([
      { parameterId: 'parameter:width', binding: { type: 'delegate' } },
      { parameterId: 'parameter:label', binding: { type: 'delegate' } },
    ])
    expect(StyleArgumentContract.createArguments(parameters, 'application')).toEqual([
      { parameterId: 'parameter:width', binding: { type: 'default' } },
      {
        parameterId: 'parameter:label',
        binding: { type: 'value', value: { type: 'literal', value: '' } },
      },
    ])
  })

  it('rejects missing, duplicate, unknown, and invalid bindings', () => {
    const parameters = [parameter('width', 10)]

    expect(StyleArgumentContract.getInvariantError([], parameters, 'inheritance'))
      .toContain('match all')
    expect(StyleArgumentContract.getInvariantError([
      { parameterId: 'parameter:width', binding: { type: 'delegate' } },
      { parameterId: 'parameter:width', binding: { type: 'delegate' } },
    ], parameters, 'inheritance')).toContain('match all')
    expect(StyleArgumentContract.getInvariantError([
      { parameterId: 'parameter:other', binding: { type: 'delegate' } },
    ], parameters, 'inheritance')).toContain('exactly one')
    expect(StyleArgumentContract.getInvariantError([
      { parameterId: 'parameter:width', binding: { type: 'delegate' } },
    ], parameters, 'application')).toContain('cannot be delegated')
    expect(StyleArgumentContract.getInvariantError([
      { parameterId: 'parameter:label', binding: { type: 'default' } },
    ], [parameter('label')], 'application')).toContain('has no default')
  })
})
