import { describe, expect, it } from 'vitest'
import ElementSearchQuery from './element-search-query'
import type ElementSearchTypes from './element-search-types'

const entry = (
  kind: string,
  idText: string,
): ElementSearchTypes.Entry => ({
  nodeId: 1,
  kind,
  normalizedKind: kind.toLowerCase(),
  address: '1',
  idText,
  normalizedIdText: idText.toLowerCase(),
})

describe('ElementSearchQuery', () => {
  it('preserves empty items when splitting filters', () => {
    expect(ElementSearchQuery.parse('box  style')).toMatchObject({
      id: { text: 'box', exact: false },
      kind: { text: '', exact: false },
    })
    expect(ElementSearchQuery.parse(' style')).toMatchObject({
      id: { text: '', exact: false },
      kind: { text: 'style', exact: false },
    })
    expect(ElementSearchQuery.parse('  style')).toMatchObject({
      id: { text: '', exact: false },
      kind: { text: '', exact: false },
    })
  })

  it('parses exact filters independently and strips the marker', () => {
    expect(ElementSearchQuery.parse('!box !style')).toMatchObject({
      id: { text: 'box', exact: true },
      kind: { text: 'style', exact: true },
    })
    expect(ElementSearchQuery.parse('!')).toMatchObject({
      id: { text: '', exact: true },
      kind: { text: '', exact: false },
    })
  })

  it('filters ID and kind case-insensitively with partial or exact matching', () => {
    const entries = [
      entry('style', 'border1'),
      entry('style', 'Box'),
      entry('style-param', 'body'),
      entry('component', 'Box'),
    ]

    expect(ElementSearchQuery.filter(entries, 'bo style')).toEqual([
      entries[0],
      entries[1],
      entries[2],
    ])
    expect(ElementSearchQuery.filter(entries, 'bo !style')).toEqual([
      entries[0],
      entries[1],
    ])
    expect(ElementSearchQuery.filter(entries, '!box')).toEqual([
      entries[1],
      entries[3],
    ])
    expect(ElementSearchQuery.filter(entries, '!')).toEqual(entries)
  })

  it('creates safe segments for every case-insensitive match', () => {
    expect(ElementSearchQuery.highlight('BorderBorder', 'der')).toEqual([
      { text: 'Bor', highlighted: false },
      { text: 'der', highlighted: true },
      { text: 'Bor', highlighted: false },
      { text: 'der', highlighted: true },
    ])
  })
})
