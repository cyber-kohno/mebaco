import type MonacoThemeCatalog from './monaco-theme-catalog'

namespace MonacoOverflowLayer {
  export type Layer = {
    element: HTMLDivElement
    setTheme: (theme: MonacoThemeCatalog.Theme) => void
    destroy: () => void
  }

  const setElementTheme = (
    element: HTMLDivElement,
    theme: MonacoThemeCatalog.Theme,
  ) => {
    element.className = [
      'monaco-editor',
      theme.baseTheme,
      'mebaco-monaco-overflow-layer',
    ].join(' ')
  }

  export const create = (
    theme: MonacoThemeCatalog.Theme,
  ): Layer => {
    const element = document.createElement('div')
    setElementTheme(element, theme)
    document.body.append(element)

    return {
      element,
      setTheme: (nextTheme) => setElementTheme(element, nextTheme),
      destroy: () => {
        element.remove()
      },
    }
  }
}

export default MonacoOverflowLayer
