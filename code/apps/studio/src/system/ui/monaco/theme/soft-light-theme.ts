import type { MonacoThemeDefinition } from './monaco-theme-definition'

const softLightTheme = {
  id: 'soft-light',
  label: 'Soft Light',
  monacoThemeName: 'soft-light',
  baseTheme: 'vs',
  tone: 'light',
  frameBackground: '#fbf8f1',
  frameBorder: '#c9c0ae',
  definition: {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7A8176', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7A4EAB' },
      { token: 'string', foreground: '39775C' },
      { token: 'number', foreground: 'A45336' },
      { token: 'type.identifier', foreground: '266E7A' },
    ],
    colors: {
      'editor.background': '#fbf8f1',
      'editor.foreground': '#383631',
      'editorLineNumber.foreground': '#aaa18f',
      'editorLineNumber.activeForeground': '#625d52',
      'editorCursor.foreground': '#7a4eab',
      'editor.selectionBackground': '#dcd2ec',
      'editor.inactiveSelectionBackground': '#ebe4f3',
      'editor.lineHighlightBackground': '#f3eee3',
      'editorWidget.background': '#fffdf8',
      'editorWidget.border': '#c9c0ae',
      'input.background': '#fffdf8',
      'input.border': '#c9c0ae',
      'list.activeSelectionBackground': '#e0d5ee',
      'list.hoverBackground': '#f0eadf',
    },
  },
} as const satisfies MonacoThemeDefinition

export default softLightTheme
