import { beforeEach, describe, expect, it } from 'vitest'
import StyleFixture from '../../../test-support/style-fixture'
import StyleParameterCatalog from './style-parameter-catalog'

describe('element StyleParameterCatalog', () => {
  beforeEach(StyleFixture.resetNodeIds)

  it('collects direct parameters', () => {
    const root = StyleFixture.project([
      StyleFixture.style('base', {
        parameters: [StyleFixture.parameter('width', 'number', 10)],
      }),
    ])

    expect(StyleParameterCatalog.createCatalog(root).resolve('base')).toEqual({
      parameters: [{
        parameterId: 'width',
        valueType: 'number',
        defaultValue: 10,
        sourceStyleId: 'base',
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

    expect(catalog.resolve('delegated').parameters.map((item) => item.parameterId)).toEqual(['width'])
    expect(catalog.resolve('defaulted').parameters).toEqual([])
    expect(catalog.resolve('valued').parameters).toEqual([])
  })

  it('reports missing styles, cycles, and parameter conflicts', () => {
    const alpha = StyleFixture.style('alpha', {
      bases: [StyleFixture.base('cycle')],
      parameters: [StyleFixture.parameter('shared', 'string')],
    })
    const beta = StyleFixture.style('beta', {
      parameters: [StyleFixture.parameter('shared', 'number')],
    })
    const cycle = StyleFixture.style('cycle', {
      bases: [StyleFixture.base('alpha')],
    })
    const conflict = StyleFixture.style('conflict', {
      bases: [
        StyleFixture.base('alpha', { shared: { type: 'delegate' } }),
        StyleFixture.base('beta', { shared: { type: 'delegate' } }),
      ],
    })
    const catalog = StyleParameterCatalog.createCatalog(
      StyleFixture.project([alpha, beta, cycle, conflict]),
    )

    expect(catalog.resolve('missing').issues[0]?.type).toBe('missing-style')
    expect(catalog.resolve('alpha').issues.some((issue) => issue.type === 'cycle')).toBe(true)
    expect(catalog.resolve('conflict').issues.some((issue) => issue.type === 'parameter-conflict')).toBe(true)
  })
})
