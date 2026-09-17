import { describe, expect, it, vi } from 'vitest'
import ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import EffectElement from './effect-element'

vi.mock('../../../../store/tree-store', () => ({
  default: { removeNode: vi.fn() },
}))

describe('EffectElement', () => {
  it('offers Mount only when the Effects container has no Mount Effect', () => {
    const available = EffectElement.createSchema({ allowMount: true })
    const occupied = EffectElement.createSchema({ allowMount: false })
    const getTriggerValues = (schema: typeof available) => {
      const field = schema.fields.find((candidate) => candidate.key === 'trigger')
      return field?.type === 'select'
        ? field.options.map((option) => option.value)
        : []
    }

    expect(getTriggerValues(available)).toEqual(['mount', 'dependencies'])
    expect(getTriggerValues(occupied)).toEqual(['dependencies'])
  })

  it('fills the available Action tab space with the script editor', () => {
    const action = EffectElement.createSchema().fields.find(
      (field) => field.key === 'action',
    )

    expect(action?.type).toBe('script')
    expect(action?.type === 'script' && action.fillAvailable).toBe(true)
  })

  it('keeps stable dependency identities and async Action source', () => {
    const schema = EffectElement.createSchema()
    const element = schema.create({
      comment: 'Load feed',
      trigger: 'dependencies',
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
      trigger: 'dependencies',
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

  it('requires at least one complete dependency', () => {
    expect(ElementEditSchema.validateEffectDependencies('[]'))
      .toBe('Add at least one dependency.')
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
