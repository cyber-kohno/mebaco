import type { MonacoThemeDefinition } from './monaco-theme-definition'

const midnightBlueTheme = {
  id: 'midnight-blue',
  label: 'Midnight Blue',
  monacoThemeName: 'midnight-blue',
  baseTheme: 'vs-dark',
  tone: 'dark',
  frameBackground: '#101827',
  frameBorder: '#40516f',
  definition: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '73809A', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C792EA' },
      { token: 'string', foreground: 'A8D68F' },
      { token: 'number', foreground: 'F2B880' },
      { token: 'type.identifier', foreground: '82C7E5' },
    ],
    colors: {
      'editor.background': '#101827',
      'editor.foreground': '#d7e0ef',
      'editorLineNumber.foreground': '#52617d',
      'editorLineNumber.activeForeground': '#aebbd0',
      'editorCursor.foreground': '#82c7e5',
      'editor.selectionBackground': '#334b72',
      'editor.inactiveSelectionBackground': '#263854',
      'editor.lineHighlightBackground': '#162137',
      'editorWidget.background': '#151f32',
      'editorWidget.border': '#40516f',
      'input.background': '#0d1421',
      'input.border': '#40516f',
      'list.activeSelectionBackground': '#334b72',
      'list.hoverBackground': '#1d2b45',
    },
  },
} as const satisfies MonacoThemeDefinition

export default midnightBlueTheme
