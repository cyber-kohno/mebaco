import mebacoDarkTheme from './theme/mebaco-dark-theme'
import mebacoLightTheme from './theme/mebaco-light-theme'
import midnightBlueTheme from './theme/midnight-blue-theme'
import type {
  MonacoBaseTheme,
  MonacoThemeDefinition,
  MonacoThemeTone,
} from './theme/monaco-theme-definition'
import softLightTheme from './theme/soft-light-theme'

const themeDefinitions = [
  mebacoLightTheme,
  softLightTheme,
  mebacoDarkTheme,
  midnightBlueTheme,
  {
    id: 'visual-studio-dark',
    label: 'Visual Studio Dark',
    monacoThemeName: 'vs-dark',
    baseTheme: 'vs-dark',
    tone: 'dark',
    frameBackground: '#1e1e1e',
    frameBorder: '#4b5960',
  },
  {
    id: 'high-contrast-dark',
    label: 'High Contrast Dark',
    monacoThemeName: 'hc-black',
    baseTheme: 'hc-black',
    tone: 'high-contrast',
    frameBackground: '#000000',
    frameBorder: '#ffffff',
  },
  {
    id: 'high-contrast-light',
    label: 'High Contrast Light',
    monacoThemeName: 'hc-light',
    baseTheme: 'hc-light',
    tone: 'high-contrast',
    frameBackground: '#ffffff',
    frameBorder: '#000000',
  },
] as const satisfies readonly MonacoThemeDefinition[]

namespace MonacoThemeCatalog {
  export type Id = (typeof themeDefinitions)[number]['id']
  export type Tone = MonacoThemeTone
  export type BaseTheme = MonacoBaseTheme
  export type Theme = MonacoThemeDefinition<Id>

  export const defaultId: Id = 'mebaco-light'
  export const themes: readonly Theme[] = themeDefinitions

  export const isId = (value: string): value is Id => (
    themes.some((theme) => theme.id === value)
  )

  export const get = (id: Id): Theme => (
    themes.find((theme) => theme.id === id) ?? themes[0]
  )
}

export default MonacoThemeCatalog
