import { BaseDirectory } from '@tauri-apps/api/path'
import { isTauri } from '@tauri-apps/api/core'
import {
  mkdir,
  readTextFile,
  rename,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import MonacoThemeCatalog from '../../ui/monaco/monaco-theme-catalog'
import CodeMemberIdentifier from '@system/model/code-analysis/code-member-identifier'
import Language from '../localization/language'
import type { AppArea } from '../navigation/app-area-store'
import type { AppSettingsStore } from './app-settings-store'

const directory = 'mebaco'
const fileName = `${directory}/settings.json`
const temporaryFileName = `${directory}/settings.json.tmp`

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value != null && !Array.isArray(value)
)

type LoadResult = Readonly<{
  state: AppSettingsStore.State
  shouldSave: boolean
}>

const normalize = (
  value: unknown,
  defaults: AppSettingsStore.State,
): LoadResult => {
  if (!isRecord(value) || !isRecord(value.general)
    || !isRecord(value.elementDefaults) || !isRecord(value.codeEditor)) {
    return { state: defaults, shouldSave: true }
  }

  const general = value.general
  const elementDefaults = value.elementDefaults
  const codeEditor = value.codeEditor
  const knownGeneral = general.language
  const knownDefaultArea = general.defaultArea
  const knownElementValues = [
    elementDefaults.loopItemVariableName,
    elementDefaults.loopIndexVariableName,
    elementDefaults.functionSignatureMode,
    elementDefaults.functionImplementationMode,
  ]
  const knownCodeEditorValues = [codeEditor.monacoTheme, codeEditor.monacoFontSize]

  if ((knownGeneral != null && (typeof knownGeneral !== 'string' || !Language.isId(knownGeneral)))
    || (knownDefaultArea != null
      && (knownDefaultArea !== 'client' && knownDefaultArea !== 'develop' && knownDefaultArea !== 'setting'))
    || knownElementValues.some((item) => item != null && typeof item !== 'string')
    || (elementDefaults.loopItemVariableName != null
      && (typeof elementDefaults.loopItemVariableName !== 'string'
        || elementDefaults.loopItemVariableName.length > 32
        || !CodeMemberIdentifier.isValid(elementDefaults.loopItemVariableName)))
    || (elementDefaults.loopIndexVariableName != null
      && (typeof elementDefaults.loopIndexVariableName !== 'string'
        || elementDefaults.loopIndexVariableName.length > 32
        || !CodeMemberIdentifier.isValid(elementDefaults.loopIndexVariableName)))
    || (elementDefaults.functionSignatureMode != null
      && elementDefaults.functionSignatureMode !== 'inline'
      && elementDefaults.functionSignatureMode !== 'refer')
    || (elementDefaults.functionImplementationMode != null
      && elementDefaults.functionImplementationMode !== 'code'
      && elementDefaults.functionImplementationMode !== 'procedure')
    || (codeEditor.monacoTheme != null
      && (typeof codeEditor.monacoTheme !== 'string' || !MonacoThemeCatalog.isId(codeEditor.monacoTheme)))
    || (codeEditor.monacoFontSize != null
      && (typeof codeEditor.monacoFontSize !== 'number'
        || !Number.isInteger(codeEditor.monacoFontSize)
        || codeEditor.monacoFontSize < 10
        || codeEditor.monacoFontSize > 32))
  ) return { state: defaults, shouldSave: true }

  const state: AppSettingsStore.State = {
    general: {
      language: (general.language as Language.Id | undefined) ?? defaults.general.language,
      defaultArea: (general.defaultArea as AppArea | undefined) ?? defaults.general.defaultArea,
    },
    elementDefaults: {
      loopItemVariableName: typeof elementDefaults.loopItemVariableName === 'string'
        ? elementDefaults.loopItemVariableName : defaults.elementDefaults.loopItemVariableName,
      loopIndexVariableName: typeof elementDefaults.loopIndexVariableName === 'string'
        ? elementDefaults.loopIndexVariableName : defaults.elementDefaults.loopIndexVariableName,
      functionSignatureMode: (elementDefaults.functionSignatureMode as AppSettingsStore.FunctionSignatureMode | undefined)
        ?? defaults.elementDefaults.functionSignatureMode,
      functionImplementationMode: (elementDefaults.functionImplementationMode as AppSettingsStore.FunctionImplementationMode | undefined)
        ?? defaults.elementDefaults.functionImplementationMode,
    },
    codeEditor: {
      monacoTheme: (codeEditor.monacoTheme as MonacoThemeCatalog.Id | undefined)
        ?? defaults.codeEditor.monacoTheme,
      monacoFontSize: typeof codeEditor.monacoFontSize === 'number'
        ? codeEditor.monacoFontSize : defaults.codeEditor.monacoFontSize,
    },
  }

  const shouldSave = Object.keys(value).length !== 3
    || Object.keys(general).length !== 2
    || Object.keys(elementDefaults).length !== 4
    || Object.keys(codeEditor).length !== 2
    || knownGeneral == null
    || knownDefaultArea == null
    || knownElementValues.some((item) => item == null)
    || knownCodeEditorValues.some((item) => item == null)
  return { state, shouldSave }
}

namespace AppSettingsPersistence {
  export const load = async (defaults: AppSettingsStore.State): Promise<LoadResult> => {
    if (!isTauri()) return { state: defaults, shouldSave: false }

    try {
      const source = await readTextFile(fileName, { baseDir: BaseDirectory.AppConfig })
      try {
        return normalize(JSON.parse(source) as unknown, defaults)
      } catch {
        return { state: defaults, shouldSave: true }
      }
    } catch {
      return { state: defaults, shouldSave: true }
    }
  }

  export const save = async (state: AppSettingsStore.State): Promise<void> => {
    if (!isTauri()) return
    await mkdir(directory, { baseDir: BaseDirectory.AppConfig, recursive: true })
    const source = `${JSON.stringify(state, null, 2)}\n`
    await writeTextFile(temporaryFileName, source, { baseDir: BaseDirectory.AppConfig })
    await rename(temporaryFileName, fileName, {
      oldPathBaseDir: BaseDirectory.AppConfig,
      newPathBaseDir: BaseDirectory.AppConfig,
    })
  }
}

export default AppSettingsPersistence
