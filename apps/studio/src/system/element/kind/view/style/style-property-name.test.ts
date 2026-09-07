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

  it('reserves animation properties for the Animations tab', () => {
    expect(ElementEditSchema.validateStyleProps(JSON.stringify([
      StyleFixture.literal('animation-duration', '1s'),
    ]))).toBe('Use the Animations tab for animation properties.')
  })

  it('validates structured animations against local Keyframes options', () => {
    const values = {
      duration: { type: 'literal', value: '1s' },
      timingFunction: { type: 'literal', value: 'ease' },
      delay: { type: 'literal', value: '0s' },
      iterationCount: { type: 'literal', value: '1' },
      direction: { type: 'literal', value: 'normal' },
      fillMode: { type: 'literal', value: 'forwards' },
      playState: { type: 'literal', value: 'running' },
      composition: { type: 'literal', value: 'replace' },
      timeline: { type: 'literal', value: 'auto' },
      rangeStart: { type: 'literal', value: 'normal' },
      rangeEnd: { type: 'literal', value: 'normal' },
    }
    const animation = {
      type: 'animation',
      mode: 'custom',
      items: [{ referenceId: 'animation-1', keyframesId: 'keyframes-1', ...values }],
    }
    const field = {
      type: 'styleAnimations' as const,
      key: 'animations',
      label: 'Animations',
      options: [{ value: 'keyframes-1', label: 'fade-in' }],
    }

    expect(ElementEditSchema.validateStyleAnimations(field, JSON.stringify([animation])))
      .toBeNull()
    animation.items[0].keyframesId = 'missing'
    expect(ElementEditSchema.validateStyleAnimations(field, JSON.stringify([animation])))
      .toBe('Select valid local Keyframes for every animation.')
  })
})
