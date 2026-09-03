import { beforeEach, describe, expect, it, vi } from 'vitest'
import ElementSearchController from './element-search-controller'
import { elementSearchStore } from './element-search-store'

const mocks = vi.hoisted(() => ({
  jumpToNode: vi.fn(() => true),
}))

vi.mock('../tree/tree-navigation-controller', () => ({
  default: { jumpToNode: mocks.jumpToNode },
}))

describe('ElementSearchController', () => {
  beforeEach(() => {
    elementSearchStore.set(null)
    mocks.jumpToNode.mockClear()
  })

  it('closes and navigates through the history-aware tree controller', () => {
    elementSearchStore.set({
      query: '',
      selectedIndex: 0,
      entries: [{
        nodeId: 42,
        kind: 'style',
        normalizedKind: 'style',
        address: '1.2.42',
        idText: 'box',
        normalizedIdText: 'box',
      }],
    })

    expect(ElementSearchController.activateSelected()).toBe(true)
    expect(mocks.jumpToNode).toHaveBeenCalledWith(42)

    let current: unknown = undefined
    const unsubscribe = elementSearchStore.subscribe((value) => {
      current = value
    })
    unsubscribe()
    expect(current).toBeNull()
  })
})
