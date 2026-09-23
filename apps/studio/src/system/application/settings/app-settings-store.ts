import { get, writable } from 'svelte/store'
import CodeMemberIdentifier from '@system/model/code-analysis/code-member-identifier'
import MonacoThemeCatalog from '../../ui/monaco/monaco-theme-catalog'
import Language from '../localization/language'
import type { AppArea } from '../navigation/app-area-store'
import AppSettingsPersistence from './app-settings-persistence'

export namespace AppSettingsStore {
  export type FunctionSignatureMode = 'inline' | 'refer'
  export type FunctionImplementationMode = 'code' | 'procedure'

  export type State = Readonly<{
    general: Readonly<{
      language: Language.Id
      defaultArea: AppArea
    }>
    elementDefaults: Readonly<{
      loopItemVariableName: string
      loopIndexVariableName: string
      functionSignatureMode: FunctionSignatureMode
      functionImplementationMode: FunctionImplementationMode
    }>
    codeEditor: Readonly<{
      monacoTheme: MonacoThemeCatalog.Id
      monacoFontSize: number
    }>
  }>

  export const createInitialState = (): State => ({
    general: {
      language: Language.defaultId,
      defaultArea: 'develop',
    },
    elementDefaults: {
      loopItemVariableName: 'item',
      loopIndexVariableName: 'index',
      functionSignatureMode: 'inline',
      functionImplementationMode: 'code',
    },
    codeEditor: {
      monacoTheme: MonacoThemeCatalog.defaultId,
      monacoFontSize: 13,
    },
  })
}

export const appSettingsStore = writable<AppSettingsStore.State>(
  AppSettingsStore.createInitialState(),
)

namespace AppSettings {
  export const monacoFontSizeRange = Object.freeze({ min: 10, max: 32 })

  export const getInitialState = () => AppSettingsStore.createInitialState()

  export const getGeneral = () => get(appSettingsStore).general
  export const getElementDefaults = () => get(appSettingsStore).elementDefaults
  export const getCodeEditor = () => get(appSettingsStore).codeEditor

  export const initialize = async (): Promise<void> => {
    const defaults = AppSettingsStore.createInitialState()
    const result = await AppSettingsPersistence.load(defaults)
    appSettingsStore.set(result.state)
    if (result.shouldSave) {
      try {
        await AppSettingsPersistence.save(result.state)
      } catch {
        // Keep the in-memory settings usable when the config directory is unavailable.
      }
    }
  }

  export const save = async (): Promise<void> => {
    try {
      await AppSettingsPersistence.save(get(appSettingsStore))
    } catch {
      // Settings remain applied for this session even when persistence fails.
    }
  }

  export const setLanguage = (language: Language.Id) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      general: {
        ...settings.general,
        language,
      },
    }))
  }

  export const setDefaultArea = (defaultArea: AppArea) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      general: {
        ...settings.general,
        defaultArea,
      },
    }))
  }

  export const setLoopIndexVariableName = (value: string): boolean => {
    if (value.length > 32 || !CodeMemberIdentifier.isValid(value)) return false

    appSettingsStore.update((settings) => ({
      ...settings,
      elementDefaults: {
        ...settings.elementDefaults,
        loopIndexVariableName: value,
      },
    }))
    return true
  }

  export const setLoopItemVariableName = (value: string): boolean => {
    if (value.length > 32 || !CodeMemberIdentifier.isValid(value)) return false

    appSettingsStore.update((settings) => ({
      ...settings,
      elementDefaults: {
        ...settings.elementDefaults,
        loopItemVariableName: value,
      },
    }))
    return true
  }

  export const setFunctionSignatureMode = (
    value: AppSettingsStore.FunctionSignatureMode,
  ) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      elementDefaults: {
        ...settings.elementDefaults,
        functionSignatureMode: value,
      },
    }))
  }

  export const setFunctionImplementationMode = (
    value: AppSettingsStore.FunctionImplementationMode,
  ) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      elementDefaults: {
        ...settings.elementDefaults,
        functionImplementationMode: value,
      },
    }))
  }

  export const setMonacoTheme = (value: MonacoThemeCatalog.Id) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      codeEditor: {
        ...settings.codeEditor,
        monacoTheme: value,
      },
    }))
  }

  export const setMonacoFontSize = (value: number): boolean => {
    if (
      !Number.isInteger(value)
      || value < monacoFontSizeRange.min
      || value > monacoFontSizeRange.max
    ) return false

    appSettingsStore.update((settings) => ({
      ...settings,
      codeEditor: {
        ...settings.codeEditor,
        monacoFontSize: value,
      },
    }))
    return true
  }

  export const applyElementDefaults = (
    value: AppSettingsStore.State['elementDefaults'],
  ) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      elementDefaults: value,
    }))
  }

  export const applyCodeEditor = (
    value: AppSettingsStore.State['codeEditor'],
  ) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      codeEditor: value,
    }))
  }

  export const reset = () => {
    appSettingsStore.set(AppSettingsStore.createInitialState())
  }
}

export default AppSettings
