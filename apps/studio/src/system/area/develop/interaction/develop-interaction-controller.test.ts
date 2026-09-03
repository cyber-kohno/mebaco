import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  closeActionMenu: vi.fn(),
}))

vi.mock('../../../action-menu/action-menu-controller', () => ({
  default: { close: mocks.closeActionMenu },
}))
vi.mock('../../../store/tree-store', () => ({
  default: {
    onLifecycle: vi.fn(() => vi.fn()),
    rootNode: { subscribe: vi.fn() },
    selectedNodeId: { set: vi.fn() },
  },
}))
vi.mock('../../../tree/tree-node', () => ({
  default: {
    findNode: vi.fn(),
    isDescendantOrSelf: vi.fn(),
  },
}))
vi.mock('../../../tree/tree-viewport-controller', () => ({
  default: {
    state: { subscribe: vi.fn() },
    setViewRootNodeId: vi.fn(),
    requestReveal: vi.fn(),
  },
}))

import DevelopInteractionController from './develop-interaction-controller'
import { developInteractionStore } from './develop-interaction-store'

describe('DevelopInteractionController destination confirmation', () => {
  beforeEach(() => {
    developInteractionStore.set({ type: 'normal' })
  })

  it.each([
    { type: 'copy' as const, sourceKind: 'tag' as const },
    { type: 'extract-signature' as const },
  ])('returns $type confirmation to destination selection', (operation) => {
    developInteractionStore.set({
      type: 'destination-transaction',
      operation,
      phase: 'confirm',
      sourceNodeId: 2,
      sourceLabel: 'source',
      originViewRootNodeId: 1,
      destinationNodeId: 3,
    })

    DevelopInteractionController.returnToDestinationSelection()

    expect(get(developInteractionStore)).toEqual({
      type: 'destination-transaction',
      operation,
      phase: 'select-destination',
      sourceNodeId: 2,
      sourceLabel: 'source',
      originViewRootNodeId: 1,
    })
  })
})
