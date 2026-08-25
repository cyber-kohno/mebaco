import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  actionMenuStore: { value: null as unknown },
  elementDialogStore: { value: { mode: 'update' } as unknown },
  confirmDialogStore: { value: null as unknown },
  runtimeSessionStore: { value: null as unknown },
  commandSessionStore: { value: null as unknown },
  appAreaStore: { value: 'develop' as unknown },
  developScreenStore: { value: 'workspace' as unknown },
  handleKeydown: vi.fn(),
}))

vi.mock('svelte/store', () => ({
  get: (store: { value: unknown }) => store.value,
}))
vi.mock('../action-menu/action-menu-store', () => ({
  actionMenuStore: mocks.actionMenuStore,
}))
vi.mock('../analysis/reference-graph-controller', () => ({
  default: { toggle: vi.fn() },
}))
vi.mock('../area/develop/develop-screen-store', () => ({
  developScreenStore: mocks.developScreenStore,
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
  default: {},
}))
vi.mock('../terminal/command-controller', () => ({
  default: { open: vi.fn() },
}))
vi.mock('../terminal/command-session-store', () => ({
  commandSessionStore: mocks.commandSessionStore,
}))
vi.mock('../tree/tree-node', () => ({
  default: {},
}))
vi.mock('./keyboard-controller', () => ({
  default: { handleKeydown: mocks.handleKeydown },
}))

import AppKeyboardController from './app-keyboard-controller'

describe('AppKeyboardController blocking layers', () => {
  beforeEach(() => {
    mocks.handleKeydown.mockClear()
    mocks.appAreaStore.value = 'develop'
    mocks.developScreenStore.value = 'workspace'
    mocks.elementDialogStore.value = { mode: 'update' }
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
})
