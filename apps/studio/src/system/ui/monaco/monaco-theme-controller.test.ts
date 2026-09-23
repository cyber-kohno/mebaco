import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as Monaco from 'monaco-editor'
import { AppSettings } from '@system/application/settings'
import MonacoThemeController from './monaco-theme-controller'

let disconnect: (() => void) | null = null

afterEach(() => {
  disconnect?.()
  disconnect = null
  AppSettings.reset()
})

describe('MonacoThemeController', () => {
  it('registers custom themes and applies setting changes globally', () => {
    const defineTheme = vi.fn()
    const setTheme = vi.fn()
    const monaco = {
      editor: { defineTheme, setTheme },
    } as unknown as typeof Monaco
    const listener = vi.fn()

    disconnect = MonacoThemeController.connect(monaco, listener)

    expect(defineTheme).toHaveBeenCalledWith(
      'mebaco-light',
      expect.objectContaining({ base: 'vs' }),
    )
    expect(defineTheme).toHaveBeenCalledWith(
      'mebaco-dark',
      expect.objectContaining({ base: 'vs-dark' }),
    )
    expect(defineTheme).toHaveBeenCalledWith(
      'soft-light',
      expect.objectContaining({ base: 'vs' }),
    )
    expect(defineTheme).toHaveBeenCalledWith(
      'midnight-blue',
      expect.objectContaining({ base: 'vs-dark' }),
    )
    expect(defineTheme).toHaveBeenCalledTimes(4)
    expect(setTheme).toHaveBeenLastCalledWith('mebaco-light')
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      id: 'mebaco-light',
      tone: 'light',
    }))

    AppSettings.setMonacoTheme('visual-studio-dark')

    expect(setTheme).toHaveBeenLastCalledWith('vs-dark')
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      id: 'visual-studio-dark',
      tone: 'dark',
    }))

    AppSettings.setMonacoTheme('high-contrast-light')

    expect(setTheme).toHaveBeenLastCalledWith('hc-light')
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      id: 'high-contrast-light',
      tone: 'high-contrast',
    }))
  })
})
