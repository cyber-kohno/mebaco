import { describe, expect, it } from 'vitest'
import ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import StyleKeyframesElement from './style-keyframes-element'

describe('StyleKeyframesElement', () => {
  it('creates an editable local definition with stable identity and initial endpoints', () => {
    const element = StyleKeyframesElement.create('fade-in')

    expect(element.kind).toBe('style-keyframes')
    expect(element.keyframesId).not.toBe('')
    expect(element.frames.map((frame) => frame.selectors[0]?.value)).toEqual([0, 100])
    expect(new Set(element.frames.map((frame) => frame.frameId)).size).toBe(2)
  })

  it('preserves the keyframes identity while updating its name and frames', () => {
    const element = StyleKeyframesElement.create('fade-in')
    const schema = StyleKeyframesElement.createSchema()
    const frame = StyleKeyframesElement.createFrame(50)
    frame.declarations = [{
      type: 'declaration',
      property: 'opacity',
      value: { type: 'literal', value: '0.5' },
    }]

    const updated = schema.update(element, {
      id: 'pulse',
      frames: JSON.stringify([frame]),
    })

    expect(updated.keyframesId).toBe(element.keyframesId)
    expect(updated.id).toBe('pulse')
    expect(updated.frames).toEqual([frame])
  })

  it('validates selectors, declarations, and duplicate properties', () => {
    const validFrame = StyleKeyframesElement.createFrame(25)
    validFrame.selectors.push({ type: 'offset', value: 75 })
    validFrame.declarations.push({
      type: 'declaration',
      property: 'opacity',
      value: { type: 'formula', source: '$local.opacity' },
    })

    expect(ElementEditSchema.validateStyleKeyframes(JSON.stringify([validFrame]))).toBeNull()

    validFrame.declarations.push({
      type: 'declaration',
      property: 'OPACITY',
      value: { type: 'literal', value: '1' },
    })
    expect(ElementEditSchema.validateStyleKeyframes(JSON.stringify([validFrame])))
      .toBe('Fill all keyframe selectors and properties.')
  })
})
