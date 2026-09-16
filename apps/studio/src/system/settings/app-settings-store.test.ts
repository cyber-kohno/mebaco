import { afterEach, describe, expect, it } from 'vitest'
import AppSettings from './app-settings-store'

afterEach(() => AppSettings.reset())

describe('AppSettings', () => {
  it('starts with the existing element creation defaults', () => {
    expect(AppSettings.getDevelopDefaults()).toEqual({
      loopIndexVariableName: 'index',
      functionSignatureMode: 'inline',
    })
    expect(AppSettings.getDevelopEditor()).toEqual({
      monacoTheme: 'mebaco-light',
      monacoFontSize: 13,
    })
  })

  it('updates the Monaco theme in memory', () => {
    AppSettings.setMonacoTheme('visual-studio-dark')

    expect(AppSettings.getDevelopEditor()).toEqual({
      monacoTheme: 'visual-studio-dark',
      monacoFontSize: 13,
    })
  })

  it('updates a valid Monaco font size in memory', () => {
    expect(AppSettings.setMonacoFontSize(18)).toBe(true)

    expect(AppSettings.getDevelopEditor()).toEqual({
      monacoTheme: 'mebaco-light',
      monacoFontSize: 18,
    })
  })

  it('rejects invalid Monaco font sizes', () => {
    expect(AppSettings.setMonacoFontSize(9)).toBe(false)
    expect(AppSettings.setMonacoFontSize(33)).toBe(false)
    expect(AppSettings.setMonacoFontSize(13.5)).toBe(false)
    expect(AppSettings.getDevelopEditor().monacoFontSize).toBe(13)
  })

  it('updates valid Develop defaults in memory', () => {
    expect(AppSettings.setLoopIndexVariableName('i')).toBe(true)
    AppSettings.setFunctionSignatureMode('refer')

    expect(AppSettings.getDevelopDefaults()).toEqual({
      loopIndexVariableName: 'i',
      functionSignatureMode: 'refer',
    })
  })

  it('rejects invalid Loop index variable names', () => {
    expect(AppSettings.setLoopIndexVariableName('0index')).toBe(false)
    expect(AppSettings.setLoopIndexVariableName('while')).toBe(false)
    expect(AppSettings.getDevelopDefaults().loopIndexVariableName).toBe('index')
  })
})
