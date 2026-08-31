import { beforeEach, describe, expect, it } from 'vitest'
import ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import StyleFixture from '../../../../test-support/style-fixture'
import StylePropertyName from './style-property-name'

describe('StylePropertyName', () => {
  beforeEach(StyleFixture.resetNodeIds)

  it('normalizes standard properties case-insensitively', () => {
    expect(StylePropertyName.normalize(' Color ')).toBe('standard:color')
    expect(StylePropertyName.hasDuplicates([
      { property: 'color' },
      { property: 'COLOR' },
    ])).toBe(true)
  })

  it('preserves case for custom properties', () => {
    expect(StylePropertyName.hasDuplicates([
      { property: '--Theme' },
      { property: '--theme' },
    ])).toBe(false)
  })

  it('rejects duplicates only within the same state', () => {
    const separated = JSON.stringify([
      StyleFixture.literal('color', 'red'),
      StyleFixture.state('hover', [StyleFixture.literal('color', 'blue')]),
    ])
    const duplicated = JSON.stringify([
      StyleFixture.literal('color', 'red'),
      StyleFixture.literal('COLOR', 'blue'),
    ])

    expect(ElementEditSchema.validateStyleProps(separated)).toBeNull()
    expect(ElementEditSchema.validateStyleProps(duplicated)).toBe(
      'Style property is duplicated in this state.',
    )
  })
})
