import { beforeEach, describe, expect, it, vi } from 'vitest'
import StyleFixture from '../../test-support/style-fixture'
import FormulaContext from '../formula/formula-context'
import StyleDeclarationResolver from './style-declaration-resolver'
import type StyleElement from '../../element/kind/view/style/style-element'
import StyleKeyframesElement from '../../element/kind/view/style/style-keyframes-element'

describe('runtime StyleDeclarationResolver', () => {
  const animation = (keyframesId: string): StyleElement.AnimationItem => ({
    referenceId: crypto.randomUUID(),
    keyframesId,
    duration: { type: 'literal', value: '1s' },
    timingFunction: { type: 'literal', value: 'ease' },
    delay: { type: 'literal', value: '0s' },
    iterationCount: { type: 'literal', value: '1' },
    direction: { type: 'literal', value: 'normal' },
    fillMode: { type: 'literal', value: 'none' },
    playState: { type: 'literal', value: 'running' },
    composition: { type: 'literal', value: 'replace' },
    timeline: { type: 'literal', value: 'auto' },
    rangeStart: { type: 'literal', value: 'normal' },
    rangeEnd: { type: 'literal', value: 'normal' },
  })

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
    const result = StyleDeclarationResolver
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
      styleId: StyleFixture.styleId('base'),
      path: ['local', 'base'],
      valueType: 'formula',
    })
    expect(result.declarations[3]?.source).toEqual({
      styleId: StyleFixture.styleId('local'),
      path: ['local'],
      valueType: 'literal',
    })
  })

  it('compiles multiple local Keyframes references and animation longhands', () => {
    const fade = StyleKeyframesElement.create('fade', [], 'keyframes:fade')
    const from = StyleKeyframesElement.createFrame(0)
    from.declarations = [StyleFixture.literal('opacity', '0')]
    const to = StyleKeyframesElement.createFrame(100)
    to.declarations = [StyleFixture.literal('opacity', '1')]
    fade.frames = [from, to]

    const first = animation(fade.keyframesId)
    first.duration = { type: 'formula', source: '`700ms`' }
    first.fillMode = { type: 'literal', value: 'forwards' }
    const second = animation(fade.keyframesId)
    second.duration = { type: 'literal', value: '2s' }
    second.iterationCount = { type: 'literal', value: 'infinite' }

    const animated = StyleFixture.style('animated', {
      keyframes: [fade],
      animations: [{ type: 'animation', mode: 'custom', items: [first, second] }],
    })
    const result = StyleDeclarationResolver
      .createCatalog(StyleFixture.project([animated]))
      .resolve([StyleFixture.application('animated')], FormulaContext.createEmpty())

    expect(result.errors).toEqual([])
    expect(result.keyframes).toHaveLength(1)
    expect(result.keyframes?.[0]?.frames).toEqual([
      { selectors: [0], declarations: [{ property: 'opacity', value: '0' }] },
      { selectors: [100], declarations: [{ property: 'opacity', value: '1' }] },
    ])
    expect(result.declarations.find((item) => item.property === 'animation-name')?.value)
      .toBe(`${result.keyframes?.[0]?.name}, ${result.keyframes?.[0]?.name}`)
    expect(result.declarations.find((item) => item.property === 'animation-duration')?.value)
      .toBe('700ms, 2s')
    expect(result.declarations.find((item) => item.property === 'animation-iteration-count')?.value)
      .toBe('1, infinite')
  })

  it('uses None as a later animation override while unspecified leaves inheritance intact', () => {
    const base = StyleFixture.style('base', {
      animations: [{ type: 'animation', mode: 'none', items: [] }],
    })
    const unspecified = StyleFixture.style('unspecified', {
      bases: [StyleFixture.base('base')],
    })
    const hoverNone = StyleFixture.style('hover-none', {
      bases: [StyleFixture.base('base')],
      animations: [{ type: 'animation', state: 'hover', mode: 'none', items: [] }],
    })
    const catalog = StyleDeclarationResolver.createCatalog(StyleFixture.project([
      base, unspecified, hoverNone,
    ]))

    expect(catalog.resolve(
      [StyleFixture.application('unspecified')], FormulaContext.createEmpty(),
    ).declarations.map(({ property, value, state }) => ({ property, value, state }))).toEqual([
      { property: 'animation-name', value: 'none', state: null },
    ])
    expect(catalog.resolve(
      [StyleFixture.application('hover-none')], FormulaContext.createEmpty(),
    ).declarations.map(({ property, value, state }) => ({ property, value, state }))).toEqual([
      { property: 'animation-name', value: 'none', state: null },
      { property: 'animation-name', value: 'none', state: 'hover' },
    ])
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
    const result = StyleDeclarationResolver
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
    const result = StyleDeclarationResolver
      .createCatalog(StyleFixture.project([parameterized]))
      .resolve([application], FormulaContext.createEmpty())

    expect(result.errors).toEqual([])
    expect(result.declarations.map((item) => item.value)).toEqual(['#ff6699'])
  })

  it('evaluates Style Locals in order after Parameters and exposes them only to that Style', () => {
    const base = StyleFixture.style('base', {
      locals: [{
        kind: 'variable', id: 'value', binding: 'const',
        typeSetting: { type: 'inferred' }, source: '"base"',
      }],
      rules: [StyleFixture.formula('content', '$local.value')],
    })
    const local = StyleFixture.style('local', {
      parameters: [StyleFixture.parameter('size', 'number')],
      locals: [
        {
          kind: 'variable', id: 'first', binding: 'const',
          typeSetting: { type: 'inferred' }, source: '$param.size + 1',
        },
        {
          kind: 'variable', id: 'second', binding: 'const',
          typeSetting: { type: 'explicit', valueType: { type: 'number' }, nullable: false },
          source: '$local.first * 2',
        },
      ],
      bases: [StyleFixture.base('base')],
      rules: [StyleFixture.formula('z-index', '$local.second.toString()')],
    })
    const result = StyleDeclarationResolver
      .createCatalog(StyleFixture.project([base, local]))
      .resolve([StyleFixture.application('local', {
        size: { type: 'value', value: { type: 'literal', value: 4 } },
      })], FormulaContext.createEmpty())

    expect(result.errors).toEqual([])
    expect(result.declarations.map(({ property, value }) => ({ property, value }))).toEqual([
      { property: 'content', value: 'base' },
      { property: 'z-index', value: '10' },
    ])
  })

  it('stops Style resolution when a Local fails', () => {
    const style = StyleFixture.style('invalid-local', {
      locals: [{
        kind: 'variable', id: 'broken', binding: 'const',
        typeSetting: { type: 'inferred' }, source: '$local.missing.value',
      }],
      rules: [StyleFixture.literal('display', 'block')],
    })
    const result = StyleDeclarationResolver
      .createCatalog(StyleFixture.project([style]))
      .resolve([StyleFixture.application('invalid-local')], FormulaContext.createEmpty())

    expect(result.declarations).toEqual([])
    expect(result.errors[0]).toMatchObject({
      type: 'local',
      localId: 'broken',
    })
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
    const result = StyleDeclarationResolver
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
    const catalog = StyleDeclarationResolver.createCatalog(StyleFixture.project([style]))

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
    const formulaResult = StyleDeclarationResolver
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
    const cssResult = StyleDeclarationResolver
      .createCatalog(StyleFixture.project([invalidCss]))
      .resolve([StyleFixture.application('invalid-css')], FormulaContext.createEmpty())

    expect(cssResult.declarations).toEqual([])
    expect(cssResult.errors[0]?.type).toBe('css-value')
  })

  it('can include unresolved formula declarations for monitor previews only', () => {
    const stateful = StyleFixture.style('stateful', {
      rules: [StyleFixture.formula('height', '`${$state.data.count}px`')],
    })
    const catalog = StyleDeclarationResolver.createCatalog(StyleFixture.project([stateful]))

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

  it('defers Tag formula arguments in monitor previews', () => {
    const rect = StyleFixture.style('rect', {
      parameters: [StyleFixture.parameter('height', 'number')],
      rules: [StyleFixture.formula('height', '`${$param.height}px`')],
    })
    const catalog = StyleDeclarationResolver.createCatalog(StyleFixture.project([rect]))
    const application = StyleFixture.application('rect', {
      height: {
        type: 'value',
        value: { type: 'formula', source: '55 + $var.index * 50' },
      },
    })

    const result = catalog.resolve(
      [application],
      FormulaContext.createEmpty(),
      {
        includeUnresolvedDeclarations: true,
        deferFormulaArguments: true,
      },
    )

    expect(result.errors).toEqual([])
    expect(result.declarations).toMatchObject([{
      property: 'height',
      value: '55 + $var.index * 50',
      unresolved: {
        type: 'formula',
        source: '55 + $var.index * 50',
      },
    }])
  })

  it('defers formulas that depend directly on runtime context in monitor previews', () => {
    const stateful = StyleFixture.style('stateful', {
      rules: [StyleFixture.formula('width', '`${10 + $state.count}px`')],
    })
    const result = StyleDeclarationResolver
      .createCatalog(StyleFixture.project([stateful]))
      .resolve(
        [StyleFixture.application('stateful')],
        FormulaContext.createEmpty(),
        { includeUnresolvedDeclarations: true, deferRuntimeFormulas: true },
      )

    expect(result.errors).toEqual([])
    expect(result.declarations).toMatchObject([{
      property: 'width',
      value: '`${10 + $state.count}px`',
      unresolved: {
        type: 'formula',
        source: '`${10 + $state.count}px`',
      },
    }])
  })

  it('reports malformed applications and inheritance cycles', () => {
    const required = StyleFixture.style('required', {
      parameters: [StyleFixture.parameter('value', 'string')],
    })
    const unresolved = StyleDeclarationResolver
      .createCatalog(StyleFixture.project([required]))
      .resolve([StyleFixture.application('required')], FormulaContext.createEmpty())
    expect(unresolved.errors[0]).toMatchObject({
      type: 'structure',
      assertion: true,
    })

    const alpha = StyleFixture.style('alpha', { bases: [StyleFixture.base('beta')] })
    const beta = StyleFixture.style('beta', { bases: [StyleFixture.base('alpha')] })
    const cycle = StyleDeclarationResolver
      .createCatalog(StyleFixture.project([alpha, beta]))
      .resolve([StyleFixture.application('alpha')], FormulaContext.createEmpty())
    expect(cycle.errors.some((error) => error.type === 'structure')).toBe(true)
  })
})
