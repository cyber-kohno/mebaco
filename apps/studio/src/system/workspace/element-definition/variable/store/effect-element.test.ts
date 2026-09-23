import { describe, expect, it, vi } from 'vitest'
import ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import EffectElementDefinition from './effect-element-definition'

vi.mock('@system/workspace/tree/state', () => ({
  default: { removeNode: vi.fn() },
}))

describe('EffectElement', () => {
  it('always shows optional Dependencies without a Trigger field', () => {
    const fields = EffectElementDefinition.createSchema().fields
    const dependencies = fields.find((field) => field.key === 'dependencies')

    expect(fields.some((field) => field.key === 'trigger')).toBe(false)
    expect(dependencies?.type).toBe('effectDependencies')
    expect(dependencies?.visibleWhen).toBeUndefined()
  })

  it('allows an empty Action and fills the available tab space with its editor', () => {
    const action = EffectElementDefinition.createSchema().fields.find(
      (field) => field.key === 'action',
    )

    expect(action?.type).toBe('script')
    if (action?.type !== 'script') throw new Error('Action field was not found.')
    expect(action.required).not.toBe(true)
    expect(action.fillAvailable).toBe(true)
    expect(ElementEditSchema.validateScript(action, '')).toBeNull()
  })

  it('keeps stable dependency identities and async Action source', () => {
    const schema = EffectElementDefinition.createSchema()
    const element = schema.create({
      comment: 'Load feed',
      dependencies: JSON.stringify([{
        dependencyId: 'feed-dependency',
        type: 'formula',
        source: '$props.feedUrl',
      }]),
      action: '$state.items = await $fn.load($props.feedUrl)',
    })

    expect(element).toEqual({
      kind: 'effect',
      comment: 'Load feed',
      dependencies: [{
        dependencyId: 'feed-dependency',
        type: 'formula',
        source: '$props.feedUrl',
      }],
      action: {
        type: 'script',
        source: '$state.items = await $fn.load($props.feedUrl)',
      },
    })
  })

  it('allows no dependencies and rejects incomplete dependencies', () => {
    expect(ElementEditSchema.validateEffectDependencies('[]')).toBeNull()
    expect(ElementEditSchema.validateEffectDependencies(JSON.stringify([{
      dependencyId: 'condition',
      type: 'formula',
      source: '',
    }]))).toBe('Fill all dependencies.')
    expect(ElementEditSchema.validateEffectDependencies(JSON.stringify([{
      dependencyId: 'condition',
      type: 'formula',
      source: '$state.condition',
    }]))).toBeNull()
  })
})
