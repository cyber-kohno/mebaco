import type * as Monaco from 'monaco-editor'

export type MonacoThemeTone = 'light' | 'dark' | 'high-contrast'
export type MonacoBaseTheme = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light'

export type MonacoThemeDefinition<Id extends string = string> = Readonly<{
  id: Id
  label: string
  monacoThemeName: string
  baseTheme: MonacoBaseTheme
  tone: MonacoThemeTone
  frameBackground: string
  frameBorder: string
  definition?: Monaco.editor.IStandaloneThemeData
}>
