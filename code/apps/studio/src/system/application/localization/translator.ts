import { derived, get, writable } from 'svelte/store'
import AppSettings, {
  appSettingsStore,
} from '@system/application/settings/app-settings-store'
import Language from './language'
import englishMessages, {
  type MessageCatalog,
  type MessageKey,
} from './messages/en'
import japaneseMessages from './messages/ja'

export type MessageParameters = Readonly<Record<string, string | number>>
export type Translator = (
  key: MessageKey,
  parameters?: MessageParameters,
) => string

export const languagePreviewStore = writable<Language.Id | null>(null)

export const setLanguagePreview = (language: Language.Id) => {
  languagePreviewStore.set(language)
}

export const clearLanguagePreview = () => {
  languagePreviewStore.set(null)
}

const catalogs: Readonly<Record<Language.Id, MessageCatalog>> = {
  en: englishMessages,
  ja: japaneseMessages,
}

export const translateFor = (
  language: Language.Id,
  key: MessageKey,
  parameters: MessageParameters = {},
): string => catalogs[language][key].replace(
  /\{([A-Za-z][A-Za-z0-9]*)\}/g,
  (placeholder, name: string) => (
    Object.hasOwn(parameters, name) ? String(parameters[name]) : placeholder
  ),
)

export const translate: Translator = (key, parameters) => translateFor(
  get(languagePreviewStore) ?? AppSettings.getGeneral().language,
  key,
  parameters,
)

export const translatorStore = derived(
  [appSettingsStore, languagePreviewStore],
  ([$settings, previewLanguage]): Translator => (key, parameters) => translateFor(
    previewLanguage ?? $settings.general.language,
    key,
    parameters,
  ),
)
