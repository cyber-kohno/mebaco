import type { MonacoThemeDefinition } from './monaco-theme-definition'

const mebacoDarkTheme = {
  id: 'mebaco-dark',
  label: 'Mebaco Dark',
  monacoThemeName: 'mebaco-dark',
  baseTheme: 'vs-dark',
  tone: 'dark',
  frameBackground: '#17252a',
  frameBorder: '#4f737a',
  definition: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '78949A', fontStyle: 'italic' },
      { token: 'keyword', foreground: '71D1DB' },
      { token: 'string', foreground: 'B7D88A' },
      { token: 'number', foreground: 'E8B87D' },
      { token: 'type.identifier', foreground: '8FCED6' },
    ],
    colors: {
      'editor.background': '#17252a',
      'editor.foreground': '#d6e5e8',
      'editorLineNumber.foreground': '#668087',
      'editorLineNumber.activeForeground': '#b8d4d9',
      'editorCursor.foreground': '#73d6df',
      'editor.selectionBackground': '#285e68',
      'editor.inactiveSelectionBackground': '#25464d',
      'editor.lineHighlightBackground': '#1d3036',
      'editorWidget.background': '#1d3036',
      'editorWidget.border': '#4f737a',
      'input.background': '#142126',
      'input.border': '#4f737a',
      'list.activeSelectionBackground': '#285e68',
      'list.hoverBackground': '#243c42',
    },
  },
} as const satisfies MonacoThemeDefinition

export default mebacoDarkTheme
