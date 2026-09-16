import type * as Monaco from 'monaco-editor'

namespace MonacoThemeCatalog {
  export type Id = 'mebaco-light' | 'visual-studio-dark'
  export type Tone = 'light' | 'dark' | 'high-contrast'
  export type BaseTheme = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light'

  export type Theme = Readonly<{
    id: Id
    label: string
    monacoThemeName: string
    baseTheme: BaseTheme
    tone: Tone
    frameBackground: string
    frameBorder: string
    definition?: Monaco.editor.IStandaloneThemeData
  }>

  export const defaultId: Id = 'mebaco-light'

  export const themes: readonly Theme[] = [
    {
      id: 'mebaco-light',
      label: 'Mebaco Light',
      monacoThemeName: 'mebaco-light',
      baseTheme: 'vs',
      tone: 'light',
      frameBackground: '#ffffff',
      frameBorder: '#9acbd4',
      definition: {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#243f47',
          'editorLineNumber.foreground': '#89aab1',
          'editorCursor.foreground': '#236f7a',
          'editor.selectionBackground': '#bdeef5',
          'editor.inactiveSelectionBackground': '#d9f4f7',
          'editorWidget.background': '#f4fbfc',
          'editorWidget.border': '#9acbd4',
        },
      },
    },
    {
      id: 'visual-studio-dark',
      label: 'Visual Studio Dark',
      monacoThemeName: 'vs-dark',
      baseTheme: 'vs-dark',
      tone: 'dark',
      frameBackground: '#1e1e1e',
      frameBorder: '#4b5960',
    },
  ]

  export const isId = (value: string): value is Id => (
    themes.some((theme) => theme.id === value)
  )

  export const get = (id: Id): Theme => (
    themes.find((theme) => theme.id === id) ?? themes[0]
  )
}

export default MonacoThemeCatalog
