import { beforeEach, describe, expect, it, vi } from 'vitest'
import StyleFixture from '@system/model/view/style/test-support/style-fixture'
import StyleReferencePreview from './style-reference-preview'

describe('StyleReferencePreview', () => {
  beforeEach(() => {
    StyleFixture.resetNodeIds()
    vi.stubGlobal('CSS', { supports: vi.fn(() => true) })
  })

  it('shows effective inherited properties while preserving formula source', () => {
    const base = StyleFixture.style('base', {
      rules: [
        StyleFixture.formula('width', '`12px`'),
        StyleFixture.literal('color', 'gray'),
        StyleFixture.state('hover', [StyleFixture.formula('color', '$state.hoverColor')]),
      ],
    })
    const local = StyleFixture.style('local', {
      bases: [StyleFixture.base('base')],
      rules: [StyleFixture.literal('color', 'red')],
    })
    const resolve = StyleReferencePreview.createResolver(StyleFixture.project([base, local]))

    expect(resolve(StyleFixture.styleId('local'))).toEqual({
      sections: [
        {
          state: null,
          entries: [
            { property: 'width', value: '`12px`', formula: true },
            { property: 'color', value: 'red', formula: false },
          ],
        },
        {
          state: 'hover',
          entries: [
            { property: 'color', value: '$state.hoverColor', formula: true },
          ],
        },
      ],
      issues: [],
    })
  })

  it('caches preview results by Style identity', () => {
    const style = StyleFixture.style('card', {
      rules: [StyleFixture.literal('display', 'block')],
    })
    const resolve = StyleReferencePreview.createResolver(StyleFixture.project([style]))

    expect(resolve(StyleFixture.styleId('card')))
      .toBe(resolve(StyleFixture.styleId('card')))
  })
})
