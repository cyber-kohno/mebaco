import { get, writable } from 'svelte/store'
import CodeMemberIdentifier from '../element/code-member-identifier'
import MonacoThemeCatalog from '../ui/monaco/monaco-theme-catalog'

namespace AppSettingsStore {
  export type FunctionSignatureMode = 'inline' | 'refer'

  export type State = Readonly<{
    client: Readonly<Record<string, never>>
    develop: Readonly<{
      defaults: Readonly<{
        loopIndexVariableName: string
        functionSignatureMode: FunctionSignatureMode
      }>
      editor: Readonly<{
        monacoTheme: MonacoThemeCatalog.Id
      }>
    }>
  }>

  export const createInitialState = (): State => ({
    client: {},
    develop: {
      defaults: {
        loopIndexVariableName: 'index',
        functionSignatureMode: 'inline',
      },
      editor: {
        monacoTheme: MonacoThemeCatalog.defaultId,
      },
    },
  })
}

export const appSettingsStore = writable<AppSettingsStore.State>(
  AppSettingsStore.createInitialState(),
)

namespace AppSettings {
  export const getDevelopDefaults = () => get(appSettingsStore).develop.defaults
  export const getDevelopEditor = () => get(appSettingsStore).develop.editor

  export const setLoopIndexVariableName = (value: string): boolean => {
    if (value.length > 32 || !CodeMemberIdentifier.isValid(value)) return false

    appSettingsStore.update((settings) => ({
      ...settings,
      develop: {
        ...settings.develop,
        defaults: {
          ...settings.develop.defaults,
          loopIndexVariableName: value,
        },
      },
    }))
    return true
  }

  export const setFunctionSignatureMode = (
    value: AppSettingsStore.FunctionSignatureMode,
  ) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      develop: {
        ...settings.develop,
        defaults: {
          ...settings.develop.defaults,
          functionSignatureMode: value,
        },
      },
    }))
  }

  export const setMonacoTheme = (value: MonacoThemeCatalog.Id) => {
    appSettingsStore.update((settings) => ({
      ...settings,
      develop: {
        ...settings.develop,
        editor: {
          ...settings.develop.editor,
          monacoTheme: value,
        },
      },
    }))
  }

  export const reset = () => {
    appSettingsStore.set(AppSettingsStore.createInitialState())
  }
}

export default AppSettings
