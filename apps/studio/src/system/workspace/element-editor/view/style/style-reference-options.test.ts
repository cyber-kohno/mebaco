import { describe, expect, it } from 'vitest'
import StyleReferenceOptions from './style-reference-options'

const options = [
  { value: '1', label: 'pageGrid', category: 'layout' },
  { value: '2', label: 'cardLayout', category: 'component-layout' },
  { value: '3', label: 'accent', category: 'theme' },
  { value: '4', label: 'plain' },
]

describe('StyleReferenceOptions', () => {
  it('uses category and id queries as AND filters', () => {
    expect(StyleReferenceOptions.getMatches(options, 'layout', 'grid'))
      .toEqual([options[0]])
    expect(StyleReferenceOptions.getMatches(options, '', 'layout'))
      .toEqual([options[1]])
  })

  it('shows uncategorized styles only when the category query is empty', () => {
    expect(StyleReferenceOptions.getMatches(options, '', '').map(({ value }) => value))
      .toEqual(['1', '2', '3', '4'])
    expect(StyleReferenceOptions.getMatches(options, 'layout', '').map(({ value }) => value))
      .toEqual(['1', '2'])
  })

  it('prioritizes exact and prefix matches before partial matches', () => {
    const ranked = [
      { value: 'partial', label: 'layout-card', category: 'component-layout' },
      { value: 'prefix', label: 'card', category: 'layout-grid' },
      { value: 'exact', label: 'card', category: 'layout' },
    ]

    expect(StyleReferenceOptions.getMatches(ranked, 'layout', 'card').map(({ value }) => value))
      .toEqual(['exact', 'prefix', 'partial'])
  })
})
