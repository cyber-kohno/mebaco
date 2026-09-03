import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  treeRoot: {
    id: 1,
    element: { kind: 'project' },
    isOpen: true,
    children: [],
  },
  rootNodeStore: { value: null as unknown },
  selectedNodeIdStore: { value: 1 },
  actionMenuStore: { value: null as unknown },
  elementDialogStore: { value: { mode: 'update' } as unknown },
  confirmDialogStore: { value: null as unknown },
  runtimeSessionStore: { value: null as unknown },
  commandSessionStore: { value: null as unknown },
  appAreaStore: { value: 'develop' as unknown },
  developScreenStore: { value: 'workspace' as unknown },
  developInteractionStore: { value: { type: 'normal' } as unknown },
  handleKeydown: vi.fn(),
  cancelInteraction: vi.fn(),
  returnToDestinationSelection: vi.fn(),
}))

vi.mock('svelte/store', () => ({
  get: (store: { value: unknown }) => store.value,
}))
vi.mock('../action-menu/action-menu-store', () => ({
  actionMenuStore: mocks.actionMenuStore,
}))
vi.mock('../analysis/reference/reference-graph-controller', () => ({
  default: { toggle: vi.fn() },
}))
vi.mock('../area/develop/develop-screen-store', () => ({
  developScreenStore: mocks.developScreenStore,
}))
vi.mock('../area/develop/interaction/develop-interaction-store', () => ({
  developInteractionStore: mocks.developInteractionStore,
}))
vi.mock('../area/develop/interaction/develop-interaction-controller', () => ({
  default: {
    cancel: mocks.cancelInteraction,
    returnToDestinationSelection: mocks.returnToDestinationSelection,
  },
}))
vi.mock('../element/element-registry', () => ({
  default: { get: vi.fn() },
}))
vi.mock('../element-dialog/element-dialog-store', () => ({
  elementDialogStore: mocks.elementDialogStore,
}))
vi.mock('../feedback/confirm/confirm-dialog-state', () => ({
  confirmDialogStore: mocks.confirmDialogStore,
}))
vi.mock('../runtime/runtime-session-store', () => ({
  default: { store: mocks.runtimeSessionStore },
}))
vi.mock('../navigation/app-area-store', () => ({
  appAreaStore: mocks.appAreaStore,
}))
vi.mock('../store/tree-store', () => ({
  default: {
    rootNode: mocks.rootNodeStore,
    selectedNodeId: mocks.selectedNodeIdStore,
    toggleDisabled: vi.fn(),
    canMoveNode: vi.fn(),
    moveNode: vi.fn(),
  },
}))
vi.mock('../terminal/command-controller', () => ({
  default: { open: vi.fn() },
}))
vi.mock('../terminal/command-session-store', () => ({
  commandSessionStore: mocks.commandSessionStore,
}))
vi.mock('../tree/tree-node', () => ({
  default: {
    getVisibleNodes: vi.fn(() => []),
    clone: vi.fn((root) => root),
  },
}))
vi.mock('../tree/tree-navigation-controller', () => ({
  default: { goBack: vi.fn(), goForward: vi.fn() },
}))
vi.mock('../tree/tree-context-menu-resolver', () => ({
  default: { resolve: vi.fn(() => []) },
}))
vi.mock('../tree/tree-viewport-controller', () => ({
  default: {
    state: { value: { viewRootNodeId: null } },
    resolveDisplayRoot: vi.fn(() => mocks.treeRoot),
    setSelectedAsCriteria: vi.fn(),
    raiseCriteria: vi.fn(),
    lowerCriteria: vi.fn(),
  },
}))
vi.mock('./keyboard-controller', () => ({
  default: { handleKeydown: mocks.handleKeydown },
}))

import AppKeyboardController from './app-keyboard-controller'

describe('AppKeyboardController blocking layers', () => {
  beforeEach(() => {
    mocks.handleKeydown.mockClear()
    mocks.cancelInteraction.mockClear()
    mocks.returnToDestinationSelection.mockClear()
    mocks.appAreaStore.value = 'develop'
    mocks.developScreenStore.value = 'workspace'
    mocks.developInteractionStore.value = { type: 'normal' }
    mocks.elementDialogStore.value = { mode: 'update' }
    mocks.rootNodeStore.value = mocks.treeRoot
  })

  it('does not dispatch shortcuts while the element dialog is open', () => {
    AppKeyboardController.handleKeydown({
      defaultPrevented: false,
      key: 'd',
    } as KeyboardEvent)

    expect(mocks.handleKeydown).not.toHaveBeenCalled()
  })

  it('does not dispatch develop shortcuts in the client area', () => {
    mocks.appAreaStore.value = 'client'
    mocks.elementDialogStore.value = null

    AppKeyboardController.handleKeydown({
      defaultPrevented: false,
      key: 'd',
    } as KeyboardEvent)

    expect(mocks.handleKeydown).not.toHaveBeenCalled()
  })

  it('does not dispatch develop shortcuts on the develop home screen', () => {
    mocks.developScreenStore.value = 'home'
    mocks.elementDialogStore.value = null

    AppKeyboardController.handleKeydown({
      defaultPrevented: false,
      key: 'd',
    } as KeyboardEvent)

    expect(mocks.handleKeydown).not.toHaveBeenCalled()
  })

  it('dispatches only destination shortcuts while selecting a copy destination', () => {
    vi.stubGlobal('HTMLElement', class HTMLElement {})
    mocks.elementDialogStore.value = null
    mocks.developInteractionStore.value = {
      type: 'destination-transaction',
      operation: { type: 'copy', sourceKind: 'tag' },
      phase: 'select-destination',
      sourceNodeId: 2,
      sourceLabel: '<div>',
      originViewRootNodeId: null,
    }
    const event = {
      defaultPrevented: false,
      key: 'v',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      target: null,
    } as unknown as KeyboardEvent

    AppKeyboardController.handleKeydown(event)

    expect(mocks.handleKeydown).toHaveBeenCalledOnce()
    const commands = mocks.handleKeydown.mock.calls[0]?.[2]
    expect(commands).toEqual([
      expect.objectContaining({ id: 'paste-to-selected-node' }),
    ])
  })

  it('returns from destination confirmation without ending the interaction on Escape', () => {
    mocks.elementDialogStore.value = null
    mocks.developInteractionStore.value = {
      type: 'destination-transaction',
      operation: { type: 'extract-signature' },
      phase: 'confirm',
      sourceNodeId: 2,
      sourceLabel: 'calculate',
      originViewRootNodeId: null,
      destinationNodeId: 3,
    }
    const event = {
      defaultPrevented: false,
      key: 'Escape',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent

    AppKeyboardController.handleKeydown(event)

    expect(mocks.returnToDestinationSelection).toHaveBeenCalledOnce()
    expect(mocks.cancelInteraction).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('ends destination selection on Escape', () => {
    mocks.elementDialogStore.value = null
    mocks.developInteractionStore.value = {
      type: 'destination-transaction',
      operation: { type: 'copy', sourceKind: 'tag' },
      phase: 'select-destination',
      sourceNodeId: 2,
      sourceLabel: '<div>',
      originViewRootNodeId: null,
    }
    const event = {
      defaultPrevented: false,
      key: 'Escape',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent

    AppKeyboardController.handleKeydown(event)

    expect(mocks.cancelInteraction).toHaveBeenCalledOnce()
    expect(mocks.returnToDestinationSelection).not.toHaveBeenCalled()
  })
})
