import type { MonacoThemeDefinition } from './monaco-theme-definition'

const mebacoLightTheme = {
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
} as const satisfies MonacoThemeDefinition

export default mebacoLightTheme
