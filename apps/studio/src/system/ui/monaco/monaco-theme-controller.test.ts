import { afterEach, describe, expect, it, vi } from 'vitest'
import type * as Monaco from 'monaco-editor'
import AppSettings from '../../settings/app-settings-store'
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
  })
})
