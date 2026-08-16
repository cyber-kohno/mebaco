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
