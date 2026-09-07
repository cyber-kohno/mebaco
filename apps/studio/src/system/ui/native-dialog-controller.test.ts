import { get } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => mocks)

import NativeDialogController from './native-dialog-controller'

describe('NativeDialogController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('releases editing focus and waits for a rendered frame before showing the dialog', async () => {
    const blur = vi.fn(() => {
      expect(NativeDialogController.isActive()).toBe(true)
    })
    class TestHtmlElement {
      blur = blur
    }
    let renderFrame: FrameRequestCallback | undefined
    vi.stubGlobal('HTMLElement', TestHtmlElement)
    vi.stubGlobal('document', { activeElement: new TestHtmlElement() })
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      renderFrame = callback
      return 1
    }))
    mocks.save.mockResolvedValue(null)

    const result = NativeDialogController.save()

    expect(blur).toHaveBeenCalledOnce()
    expect(mocks.save).not.toHaveBeenCalled()

    renderFrame?.(0)
    await expect(result).resolves.toBeNull()
    expect(mocks.save).toHaveBeenCalledOnce()
  })

  it('reports an active dialog until it settles', async () => {
    let resolveDialog: ((value: string | null) => void) | undefined
    mocks.save.mockReturnValue(new Promise<string | null>((resolve) => {
      resolveDialog = resolve
    }))

    const result = NativeDialogController.save({ title: 'Save' })

    expect(NativeDialogController.isActive()).toBe(true)
    expect(get(NativeDialogController.active)).toBe(true)

    resolveDialog?.('C:\\sample.mbcapp')
    await expect(result).resolves.toBe('C:\\sample.mbcapp')
    expect(NativeDialogController.isActive()).toBe(false)
    expect(get(NativeDialogController.active)).toBe(false)
  })

  it('clears the active state when a dialog fails', async () => {
    mocks.open.mockRejectedValue(new Error('dialog failed'))

    await expect(NativeDialogController.open()).rejects.toThrow('dialog failed')
    expect(NativeDialogController.isActive()).toBe(false)
    expect(get(NativeDialogController.active)).toBe(false)
  })

  it('stays active until all concurrent dialogs settle', async () => {
    let resolveFirst: ((value: string | null) => void) | undefined
    let resolveSecond: ((value: string | null) => void) | undefined
    mocks.save
      .mockReturnValueOnce(new Promise<string | null>((resolve) => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise<string | null>((resolve) => { resolveSecond = resolve }))

    const first = NativeDialogController.save()
    const second = NativeDialogController.save()
    resolveFirst?.(null)
    await first

    expect(NativeDialogController.isActive()).toBe(true)

    resolveSecond?.(null)
    await second
    expect(NativeDialogController.isActive()).toBe(false)
  })
})
