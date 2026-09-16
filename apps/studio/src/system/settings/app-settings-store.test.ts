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
    })
  })

  it('updates the Monaco theme in memory', () => {
    AppSettings.setMonacoTheme('visual-studio-dark')

    expect(AppSettings.getDevelopEditor()).toEqual({
      monacoTheme: 'visual-studio-dark',
    })
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
