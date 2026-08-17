import { beforeEach, describe, expect, it, vi } from 'vitest'
import StyleFixture from '../../test-support/style-fixture'
import FormulaContext from '../formula/formula-context'
import StyleResolver from './style-resolver'

describe('runtime StyleResolver', () => {
  beforeEach(() => {
    StyleFixture.resetNodeIds()
    vi.stubGlobal('CSS', {
      supports: vi.fn(() => true),
    })
  })

  it('resolves inheritance, parameter bindings, state rules, and source metadata', () => {
    const base = StyleFixture.style('base', {
      parameters: [StyleFixture.parameter('width', 'number')],
      rules: [
        StyleFixture.formula('width', '`${$param.width}px`'),
        StyleFixture.literal('color', 'gray'),
        StyleFixture.state('hover', [StyleFixture.literal('color', 'blue')]),
      ],
    })
    const local = StyleFixture.style('local', {
      bases: [StyleFixture.base('base', {
        width: {
          type: 'value',
          value: { type: 'literal', value: 24 },
        },
      })],
      rules: [StyleFixture.literal('color', 'red')],
    })
    const result = StyleResolver
      .createCatalog(StyleFixture.project([base, local]))
      .resolve([StyleFixture.application('local')], FormulaContext.createEmpty())

    expect(result.errors).toEqual([])
    expect(result.declarations.map(({ property, value, state }) => ({ property, value, state }))).toEqual([
      { property: 'width', value: '24px', state: null },
      { property: 'color', value: 'gray', state: null },
      { property: 'color', value: 'blue', state: 'hover' },
      { property: 'color', value: 'red', state: null },
    ])
    expect(result.declarations[0]?.source).toEqual({
      styleId: 'base',
      path: ['local', 'base'],
      valueType: 'formula',
    })
    expect(result.declarations[3]?.source).toEqual({
      styleId: 'local',
      path: ['local'],
      valueType: 'literal',
    })
  })

  it('resolves default, literal, and formula application bindings', () => {
    const parameterized = StyleFixture.style('parameterized', {
      parameters: [
        StyleFixture.parameter('count', 'number', 2),
        StyleFixture.parameter('name', 'string'),
        StyleFixture.parameter('enabled', 'boolean'),
      ],
      rules: [
        StyleFixture.formula('z-index', '$param.count.toString()'),
        StyleFixture.formula('content', '`"${$param.name}:${$param.enabled}"`'),
      ],
    })
    const application = StyleFixture.application('parameterized', {
      count: { type: 'default' },
      name: {
        type: 'value',
        value: { type: 'literal', value: 'item' },
      },
      enabled: {
        type: 'value',
        value: { type: 'formula', source: '1 + 1 === 2' },
      },
    })
    const result = StyleResolver
      .createCatalog(StyleFixture.project([parameterized]))
      .resolve([application], FormulaContext.createEmpty())

    expect(result.errors).toEqual([])
    expect(result.declarations.map((item) => item.value)).toEqual(['2', '"item:true"'])
  })

  it('treats color parameters as strings at runtime', () => {
    const parameterized = StyleFixture.style('parameterized-color', {
      parameters: [
        StyleFixture.parameter('accent', 'color', '#66ccff'),
      ],
      rules: [
        StyleFixture.formula('color', '$param.accent'),
      ],
    })
    const application = StyleFixture.application('parameterized-color', {
      accent: {
        type: 'value',
        value: { type: 'literal', value: '#ff6699' },
      },
    })
    const result = StyleResolver
      .createCatalog(StyleFixture.project([parameterized]))
      .resolve([application], FormulaContext.createEmpty())

    expect(result.errors).toEqual([])
    expect(result.declarations.map((item) => item.value)).toEqual(['#ff6699'])
  })

  it('resolves square tag style declarations used by runtime preview', () => {
    const square = StyleFixture.style('square', {
      rules: [
        StyleFixture.literal('display', 'inline-block'),
        StyleFixture.literal('width', '100px'),
        StyleFixture.literal('height', '100px'),
        StyleFixture.literal('background', 'red'),
      ],
    })
    const result = StyleResolver
      .createCatalog(StyleFixture.project([square]))
      .resolve([StyleFixture.application('square')], FormulaContext.createEmpty())

    expect(result.errors).toEqual([])
    expect(result.declarations.map(({ property, value }) => ({ property, value }))).toEqual([
      { property: 'display', value: 'inline-block' },
      { property: 'width', value: '100px' },
      { property: 'height', value: '100px' },
      { property: 'background', value: 'red' },
    ])
  })

  it('applies conditions and reports invalid condition results', () => {
    const style = StyleFixture.style('conditional', {
      rules: [StyleFixture.literal('display', 'block')],
    })
    const catalog = StyleResolver.createCatalog(StyleFixture.project([style]))

    expect(catalog.resolve(
      [StyleFixture.application('conditional', {}, 'false')],
      FormulaContext.createEmpty(),
    ).declarations).toEqual([])

    const invalid = catalog.resolve(
      [StyleFixture.application('conditional', {}, `'yes'`)],
      FormulaContext.createEmpty(),
    )
    expect(invalid.errors[0]?.type).toBe('result-type')
  })

  it('returns structured errors for formula types and unsupported CSS values', () => {
    const invalidFormula = StyleFixture.style('invalid-formula', {
      rules: [StyleFixture.formula('opacity', '1')],
    })
    const formulaResult = StyleResolver
      .createCatalog(StyleFixture.project([invalidFormula]))
      .resolve([StyleFixture.application('invalid-formula')], FormulaContext.createEmpty())

    expect(formulaResult.declarations).toEqual([])
    expect(formulaResult.errors[0]?.type).toBe('result-type')

    vi.stubGlobal('CSS', {
      supports: vi.fn(() => false),
    })
    const invalidCss = StyleFixture.style('invalid-css', {
      rules: [StyleFixture.literal('display', 'not-a-display-value')],
    })
    const cssResult = StyleResolver
      .createCatalog(StyleFixture.project([invalidCss]))
      .resolve([StyleFixture.application('invalid-css')], FormulaContext.createEmpty())

    expect(cssResult.declarations).toEqual([])
    expect(cssResult.errors[0]?.type).toBe('css-value')
  })

  it('can include unresolved formula declarations for monitor previews only', () => {
    const stateful = StyleFixture.style('stateful', {
      rules: [StyleFixture.formula('height', '`${$state.data.count}px`')],
    })
    const catalog = StyleResolver.createCatalog(StyleFixture.project([stateful]))

    const runtimeResult = catalog.resolve(
      [StyleFixture.application('stateful')],
      FormulaContext.createEmpty(),
    )
    const monitorResult = catalog.resolve(
      [StyleFixture.application('stateful')],
      FormulaContext.createEmpty(),
      { includeUnresolvedDeclarations: true },
    )

    expect(runtimeResult.declarations).toEqual([])
    expect(runtimeResult.errors[0]?.type).toBe('formula')
    expect(monitorResult.errors[0]?.type).toBe('formula')
    expect(monitorResult.declarations).toMatchObject([{
      property: 'height',
      value: '`${$state.data.count}px`',
      unresolved: {
        type: 'formula',
        source: '`${$state.data.count}px`',
      },
    }])
  })

  it('reports unresolved delegated parameters and inheritance cycles', () => {
    const required = StyleFixture.style('required', {
      parameters: [StyleFixture.parameter('value', 'string')],
    })
    const unresolved = StyleResolver
      .createCatalog(StyleFixture.project([required]))
      .resolve([StyleFixture.application('required')], FormulaContext.createEmpty())
    expect(unresolved.errors[0]?.type).toBe('result-type')

    const alpha = StyleFixture.style('alpha', { bases: [StyleFixture.base('beta')] })
    const beta = StyleFixture.style('beta', { bases: [StyleFixture.base('alpha')] })
    const cycle = StyleResolver
      .createCatalog(StyleFixture.project([alpha, beta]))
      .resolve([StyleFixture.application('alpha')], FormulaContext.createEmpty())
    expect(cycle.errors.some((error) => error.type === 'structure')).toBe(true)
  })
})
