import { afterEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import AppSettings, { appSettingsStore } from './app-settings-store'

afterEach(() => AppSettings.reset())

describe('AppSettings', () => {
  it('organizes settings by purpose instead of application area', () => {
    expect(get(appSettingsStore)).toEqual({
      general: {
        language: 'en',
        defaultArea: 'develop',
      },
      codeEditor: {
        monacoTheme: 'mebaco-light',
        monacoFontSize: 13,
      },
      elementDefaults: {
        loopItemVariableName: 'item',
        loopIndexVariableName: 'index',
        functionSignatureMode: 'inline',
        functionImplementationMode: 'code',
      },
    })
  })

  it('updates the display language in memory', () => {
    AppSettings.setLanguage('ja')

    expect(AppSettings.getGeneral()).toEqual({ language: 'ja', defaultArea: 'develop' })
  })

  it('updates the default application area in memory', () => {
    AppSettings.setDefaultArea('client')

    expect(AppSettings.getGeneral().defaultArea).toBe('client')
  })

  it('starts with the existing element creation defaults', () => {
    expect(AppSettings.getElementDefaults()).toEqual({
      loopItemVariableName: 'item',
      loopIndexVariableName: 'index',
      functionSignatureMode: 'inline',
      functionImplementationMode: 'code',
    })
    expect(AppSettings.getCodeEditor()).toEqual({
      monacoTheme: 'mebaco-light',
      monacoFontSize: 13,
    })
  })

  it('updates the Monaco theme in memory', () => {
    AppSettings.setMonacoTheme('visual-studio-dark')

    expect(AppSettings.getCodeEditor()).toEqual({
      monacoTheme: 'visual-studio-dark',
      monacoFontSize: 13,
    })
  })

  it('updates a valid Monaco font size in memory', () => {
    expect(AppSettings.setMonacoFontSize(18)).toBe(true)

    expect(AppSettings.getCodeEditor()).toEqual({
      monacoTheme: 'mebaco-light',
      monacoFontSize: 18,
    })
  })

  it('rejects invalid Monaco font sizes', () => {
    expect(AppSettings.setMonacoFontSize(9)).toBe(false)
    expect(AppSettings.setMonacoFontSize(33)).toBe(false)
    expect(AppSettings.setMonacoFontSize(13.5)).toBe(false)
    expect(AppSettings.getCodeEditor().monacoFontSize).toBe(13)
  })

  it('updates valid element defaults in memory', () => {
    expect(AppSettings.setLoopItemVariableName('entry')).toBe(true)
    expect(AppSettings.setLoopIndexVariableName('i')).toBe(true)
    AppSettings.setFunctionSignatureMode('refer')
    AppSettings.setFunctionImplementationMode('procedure')

    expect(AppSettings.getElementDefaults()).toEqual({
      loopItemVariableName: 'entry',
      loopIndexVariableName: 'i',
      functionSignatureMode: 'refer',
      functionImplementationMode: 'procedure',
    })
  })

  it('rejects invalid Loop index variable names', () => {
    expect(AppSettings.setLoopIndexVariableName('0index')).toBe(false)
    expect(AppSettings.setLoopIndexVariableName('while')).toBe(false)
    expect(AppSettings.getElementDefaults().loopIndexVariableName).toBe('index')
  })

  it('rejects invalid Loop item variable names', () => {
    expect(AppSettings.setLoopItemVariableName('0item')).toBe(false)
    expect(AppSettings.setLoopItemVariableName('while')).toBe(false)
    expect(AppSettings.getElementDefaults().loopItemVariableName).toBe('item')
  })
})
