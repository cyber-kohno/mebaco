import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  actionMenuStore: { value: null as unknown },
  elementDialogStore: { value: { mode: 'update' } as unknown },
  confirmDialogStore: { value: null as unknown },
  runtimeSessionStore: { value: null as unknown },
  screenStore: { value: 'develop' as unknown },
  handleKeydown: vi.fn(),
}))

vi.mock('svelte/store', () => ({
  get: (store: { value: unknown }) => store.value,
}))
vi.mock('../action-menu/action-menu-store', () => ({
  actionMenuStore: mocks.actionMenuStore,
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
vi.mock('../store/screen-store', () => ({
  screenStore: mocks.screenStore,
}))
vi.mock('../store/tree-store', () => ({
  default: {},
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
    mocks.elementDialogStore.value = { mode: 'update' }
  })

  it('does not dispatch shortcuts while the element dialog is open', () => {
    AppKeyboardController.handleKeydown({
      defaultPrevented: false,
      key: 'd',
    } as KeyboardEvent)

    expect(mocks.handleKeydown).not.toHaveBeenCalled()
  })
})
