import { describe, expect, it } from 'vitest'
import StylePropertyCatalog from '../../element/kind/view/style/style-property-catalog'
import SuggestTextOptions from './suggest-text-options'

const options = (
  ...values: string[]
) => values.map((value) => ({ value }))

describe('SuggestTextOptions', () => {
  it('ranks exact, prefix, token-boundary, and substring matches in that order', () => {
    const source = options(
      'margin-left',
      'cleft',
      'leftover',
      'left',
      'border-left',
      'left-edge',
    )

    expect(SuggestTextOptions.getMatches(source, 'left').map(({ value }) => value))
      .toEqual([
        'left',
        'leftover',
        'left-edge',
        'margin-left',
        'border-left',
        'cleft',
      ])
  })

  it('preserves the configured order within the same rank and for an empty query', () => {
    const source = options('margin-top', 'padding-top', 'top-edge', 'top-side')

    expect(SuggestTextOptions.getMatches(source, 'top').map(({ value }) => value))
      .toEqual(['top-edge', 'top-side', 'margin-top', 'padding-top'])
    expect(SuggestTextOptions.getMatches(source, '', 2).map(({ value }) => value))
      .toEqual(['margin-top', 'padding-top'])
  })

  it('matches case-insensitively and applies the limit after ranking', () => {
    const source = options('margin-left', 'left-edge', 'LEFT', 'border-left')

    expect(SuggestTextOptions.getMatches(source, 'left', 2).map(({ value }) => value))
      .toEqual(['LEFT', 'left-edge'])
  })

  it('keeps coordinate properties visible in the standard property suggestions', () => {
    expect(SuggestTextOptions.getMatches(StylePropertyCatalog.options, 'left')[0]?.value)
      .toBe('left')
    expect(SuggestTextOptions.getMatches(StylePropertyCatalog.options, 'top')[0]?.value)
      .toBe('top')
    expect(SuggestTextOptions.getMatches(StylePropertyCatalog.options, 'right')[0]?.value)
      .toBe('right')
    expect(SuggestTextOptions.getMatches(StylePropertyCatalog.options, 'bottom')[0]?.value)
      .toBe('bottom')
  })
})
