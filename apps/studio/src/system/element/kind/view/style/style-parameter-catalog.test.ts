import { beforeEach, describe, expect, it } from 'vitest'
import StyleFixture from '../../../../test-support/style-fixture'
import StyleParameterCatalog from './style-parameter-catalog'

describe('element StyleParameterCatalog', () => {
  beforeEach(StyleFixture.resetNodeIds)

  it('collects direct parameters', () => {
    const root = StyleFixture.project([
      StyleFixture.style('base', {
        parameters: [StyleFixture.parameter('width', 'number', 10)],
      }),
    ])

    expect(StyleParameterCatalog.createCatalog(root).resolve(StyleFixture.styleId('base'))).toEqual({
      parameters: [{
        parameterId: StyleFixture.parameterId('width'),
        id: 'width',
        valueType: 'number',
        defaultValue: 10,
        sourceStyleId: StyleFixture.styleId('base'),
        sourceStyleName: 'base',
        sourcePath: ['base'],
      }],
      issues: [],
    })
  })

  it('exposes delegated parameters and resolves bound parameters', () => {
    const base = StyleFixture.style('base', {
      parameters: [StyleFixture.parameter('width', 'number', 10)],
    })
    const delegated = StyleFixture.style('delegated', {
      bases: [StyleFixture.base('base', { width: { type: 'delegate' } })],
    })
    const defaulted = StyleFixture.style('defaulted', {
      bases: [StyleFixture.base('base', { width: { type: 'default' } })],
    })
    const valued = StyleFixture.style('valued', {
      bases: [StyleFixture.base('base', {
        width: {
          type: 'value',
          value: { type: 'literal', value: 20 },
        },
      })],
    })
    const catalog = StyleParameterCatalog.createCatalog(
      StyleFixture.project([base, delegated, defaulted, valued]),
    )

    expect(catalog.resolve(StyleFixture.styleId('delegated')).parameters.map((item) => item.id)).toEqual(['width'])
    expect(catalog.resolve(StyleFixture.styleId('defaulted')).parameters).toEqual([])
    expect(catalog.resolve(StyleFixture.styleId('valued')).parameters).toEqual([])
  })

  it('reports missing styles, cycles, and parameter conflicts', () => {
    const alpha = StyleFixture.style('alpha', {
      parameters: [StyleFixture.parameter('shared', 'string')],
    })
    const beta = StyleFixture.style('beta', {
      parameters: [StyleFixture.parameter('shared', 'number')],
    })
    const cycleAlpha = StyleFixture.style('cycle-alpha', {
      bases: [StyleFixture.base('cycle-beta')],
    })
    const cycleBeta = StyleFixture.style('cycle-beta', {
      bases: [StyleFixture.base('cycle-alpha')],
    })
    const conflict = StyleFixture.style('conflict', {
      bases: [
        StyleFixture.base('alpha', { shared: { type: 'delegate' } }),
        StyleFixture.base('beta', { shared: { type: 'delegate' } }),
      ],
    })
    const catalog = StyleParameterCatalog.createCatalog(
      StyleFixture.project([alpha, beta, cycleAlpha, cycleBeta, conflict]),
    )

    expect(catalog.resolve(StyleFixture.styleId('missing')).issues[0]?.type).toBe('missing-style')
    expect(catalog.resolve(StyleFixture.styleId('cycle-alpha')).issues.some((issue) => issue.type === 'cycle')).toBe(true)
    expect(catalog.resolve(StyleFixture.styleId('conflict')).issues.some((issue) => issue.type === 'parameter-conflict')).toBe(true)
  })
})
