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
  elementSearchStore: { value: null as unknown },
  appAreaStore: { value: 'develop' as unknown },
  developScreenStore: { value: 'workspace' as unknown },
  developInteractionStore: { value: { type: 'normal' } as unknown },
  projectSessionStore: { value: { isDirty: true } as unknown },
  handleKeydown: vi.fn(),
  saveWithAlert: vi.fn(),
  openElementSearch: vi.fn(),
  cancelInteraction: vi.fn(),
  returnToDestinationSelection: vi.fn(),
  launchAppShortcut: vi.fn(),
}))

vi.mock('svelte/store', () => ({
  get: (store: { value: unknown }) => store.value,
}))
vi.mock('@system/ui/action-menu/action-menu-store', () => ({
  actionMenuStore: mocks.actionMenuStore,
}))
vi.mock('@system/workspace/reference/controller', () => ({
  ReferenceGraphController: { toggle: vi.fn() },
}))
vi.mock('@system/workspace/screen', () => ({
  developScreenStore: mocks.developScreenStore,
}))
vi.mock('@system/workspace/interaction/state', () => ({
  developInteractionStore: mocks.developInteractionStore,
}))
vi.mock('@system/workspace/interaction/controller', () => ({
  DevelopInteractionController: {
    cancel: mocks.cancelInteraction,
    returnToDestinationSelection: mocks.returnToDestinationSelection,
  },
}))
vi.mock('@system/workspace/element-definition/element-registry', () => ({
  default: { get: vi.fn() },
}))
vi.mock('@system/application/debug/debug-launch-shortcut-controller', () => ({
  default: { launch: mocks.launchAppShortcut },
}))
vi.mock('@system/workspace/element-editor/element-dialog-store', () => ({
  elementDialogStore: mocks.elementDialogStore,
}))
vi.mock('@system/workspace/search/controller', () => ({
  ElementSearchController: { open: mocks.openElementSearch },
}))
vi.mock('@system/workspace/search/state', () => ({
  elementSearchStore: mocks.elementSearchStore,
}))
vi.mock('@system/ui/feedback/confirm', () => ({
  confirmDialogStore: mocks.confirmDialogStore,
}))
vi.mock('../../runtime/runtime-session-store', () => ({
  default: { store: mocks.runtimeSessionStore },
}))
vi.mock('@system/application/navigation', () => ({
  appAreaStore: mocks.appAreaStore,
}))
vi.mock('../../project/project-file', () => ({
  default: { saveWithAlert: mocks.saveWithAlert },
}))
vi.mock('../../project/project-session-store', () => ({
  default: { store: mocks.projectSessionStore },
}))
vi.mock('@system/workspace/tree/state', () => ({
  default: {
    rootNode: mocks.rootNodeStore,
    selectedNodeId: mocks.selectedNodeIdStore,
    toggleDisabled: vi.fn(),
    canMoveNode: vi.fn(),
    moveNode: vi.fn(),
  },
}))
vi.mock('../../terminal/command-controller', () => ({
  default: { open: vi.fn() },
}))
vi.mock('../../terminal/command-session-store', () => ({
  commandSessionStore: mocks.commandSessionStore,
}))
vi.mock('@system/model/tree/tree-node', () => ({
  default: {
    getVisibleNodes: vi.fn(() => []),
    clone: vi.fn((root) => root),
  },
}))
vi.mock('@system/workspace/tree/navigation', () => ({
  TreeNavigationController: { goBack: vi.fn(), goForward: vi.fn() },
  TreeViewportController: {
    state: { value: { viewRootNodeId: null } },
    resolveDisplayRoot: vi.fn(() => mocks.treeRoot),
    setSelectedAsCriteria: vi.fn(),
    raiseCriteria: vi.fn(),
    lowerCriteria: vi.fn(),
  },
}))
vi.mock('@system/workspace/tree/context-menu', () => ({
  TreeContextMenuResolver: { resolve: vi.fn(() => []) },
}))
vi.mock('@system/workspace/shortcut/controller', () => ({
  KeyboardController: { handleKeydown: mocks.handleKeydown },
}))

import AppKeyboardController from './app-keyboard-controller'

describe('AppKeyboardController blocking layers', () => {
  beforeEach(() => {
    mocks.handleKeydown.mockClear()
    mocks.saveWithAlert.mockClear()
    mocks.openElementSearch.mockClear()
    mocks.cancelInteraction.mockClear()
    mocks.returnToDestinationSelection.mockClear()
    mocks.appAreaStore.value = 'develop'
    mocks.developScreenStore.value = 'workspace'
    mocks.developInteractionStore.value = { type: 'normal' }
    mocks.projectSessionStore.value = { isDirty: true }
    mocks.actionMenuStore.value = null
    mocks.elementDialogStore.value = { mode: 'update' }
    mocks.confirmDialogStore.value = null
    mocks.runtimeSessionStore.value = null
    mocks.commandSessionStore.value = null
    mocks.elementSearchStore.value = null
    mocks.rootNodeStore.value = mocks.treeRoot
  })

  it('does not dispatch shortcuts while the element dialog is open', () => {
    AppKeyboardController.handleKeydown({
      defaultPrevented: false,
      key: 'd',
    } as KeyboardEvent)

    expect(mocks.handleKeydown).not.toHaveBeenCalled()
  })

  it('opens element search with Ctrl+P even from an editable target', () => {
    mocks.elementDialogStore.value = null
    const event = {
      defaultPrevented: false,
      key: 'p',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      target: { matches: () => true },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent

    AppKeyboardController.handleKeydown(event)

    expect(mocks.openElementSearch).toHaveBeenCalledOnce()
    expect(mocks.openElementSearch).toHaveBeenCalledWith('element-id')
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('opens node ID search with Ctrl+N even from an editable target', () => {
    mocks.elementDialogStore.value = null
    const event = {
      defaultPrevented: false,
      key: 'n',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      target: { matches: () => true },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent

    AppKeyboardController.handleKeydown(event)

    expect(mocks.openElementSearch).toHaveBeenCalledOnce()
    expect(mocks.openElementSearch).toHaveBeenCalledWith('node-id')
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('saves a dirty project with Ctrl+S from the develop workspace', () => {
    mocks.elementDialogStore.value = null
    const event = {
      defaultPrevented: false,
      key: 's',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      repeat: false,
      target: { matches: () => true },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent

    AppKeyboardController.handleKeydown(event)

    expect(mocks.saveWithAlert).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('does not save an unchanged project with Ctrl+S', () => {
    mocks.elementDialogStore.value = null
    mocks.projectSessionStore.value = { isDirty: false }

    AppKeyboardController.handleKeydown({
      defaultPrevented: false,
      key: 's',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent)

    expect(mocks.saveWithAlert).not.toHaveBeenCalled()
  })

  it.each([
    ['client area', 'client', 'workspace'],
    ['develop home screen', 'develop', 'home'],
  ])('does not save with Ctrl+S in the %s', (_name, area, screen) => {
    mocks.appAreaStore.value = area
    mocks.developScreenStore.value = screen
    mocks.elementDialogStore.value = null

    AppKeyboardController.handleKeydown({
      defaultPrevented: false,
      key: 's',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent)

    expect(mocks.saveWithAlert).not.toHaveBeenCalled()
  })

  it.each([
    ['element dialog', mocks.elementDialogStore, { mode: 'update' }],
    ['terminal', mocks.commandSessionStore, { mode: 'command' }],
    ['element search', mocks.elementSearchStore, { query: '' }],
  ])('does not save with Ctrl+S while the %s is open', (_name, store, value) => {
    mocks.elementDialogStore.value = null
    store.value = value

    AppKeyboardController.handleKeydown({
      defaultPrevented: false,
      key: 's',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent)

    expect(mocks.saveWithAlert).not.toHaveBeenCalled()
    store.value = null
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

  it.each(['copy', 'move'] as const)(
    'dispatches only destination shortcuts while selecting a %s destination',
    (operationType) => {
      vi.stubGlobal('HTMLElement', class HTMLElement {})
      mocks.elementDialogStore.value = null
      mocks.developInteractionStore.value = {
        type: 'destination-transaction',
        operation: { type: operationType, sourceKind: 'tag' },
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
    },
  )

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
