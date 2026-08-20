import { describe, expect, it, vi } from 'vitest'
import ActionMenuState from '../action-menu/action-menu-state'
import DisabledActionMenu from './disabled-action-menu'

const { action } = ActionMenuState.createFactory()

describe('DisabledActionMenu', () => {
  it('adds Disabled immediately before Delete', () => {
    const items = DisabledActionMenu.add([
      action('Modify', vi.fn()),
      action('Delete', vi.fn(), 'danger'),
    ], false, vi.fn())

    expect(items.map((item) => item.label)).toEqual([
      'Modify',
      'Disabled',
      'Delete',
    ])
  })

  it('adds the toggle at the end when Delete is absent', () => {
    const items = DisabledActionMenu.add([
      action('Add Child', vi.fn()),
    ], false, vi.fn())

    expect(items.map((item) => item.label)).toEqual([
      'Add Child',
      'Disabled',
    ])
  })

  it('shows Enabled and invokes the supplied toggle for a disabled node', () => {
    const toggle = vi.fn()
    const items = DisabledActionMenu.add([], true, toggle)
    const enabledItem = items[0]

    expect(enabledItem.label).toBe('Enabled')
    if (enabledItem.type !== 'action') throw new Error('Expected an action item')
    enabledItem.callback()
    expect(toggle).toHaveBeenCalledOnce()
  })
})
