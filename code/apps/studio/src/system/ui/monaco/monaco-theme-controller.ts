import type * as Monaco from 'monaco-editor'
import type { Unsubscriber } from 'svelte/store'
import { appSettingsStore } from '@system/application/settings'
import MonacoThemeCatalog from './monaco-theme-catalog'

namespace MonacoThemeController {
  export type Listener = (theme: MonacoThemeCatalog.Theme) => void

  const registeredTargets = new WeakSet<object>()
  const listeners = new Set<Listener>()
  let target: typeof Monaco | null = null
  let unsubscribeSettings: Unsubscriber | null = null
  let activeTheme = MonacoThemeCatalog.get(MonacoThemeCatalog.defaultId)

  const registerThemes = (nextTarget: typeof Monaco) => {
    if (registeredTargets.has(nextTarget)) return

    MonacoThemeCatalog.themes.forEach((theme) => {
      if (theme.definition != null) {
        nextTarget.editor.defineTheme(theme.monacoThemeName, theme.definition)
      }
    })
    registeredTargets.add(nextTarget)
  }

  const apply = (theme: MonacoThemeCatalog.Theme) => {
    activeTheme = theme
    target?.editor.setTheme(theme.monacoThemeName)
    listeners.forEach((listener) => listener(theme))
  }

  export const connect = (
    nextTarget: typeof Monaco,
    listener: Listener,
  ): Unsubscriber => {
    registerThemes(nextTarget)
    target = nextTarget
    listeners.add(listener)

    if (unsubscribeSettings == null) {
      unsubscribeSettings = appSettingsStore.subscribe((settings) => {
        apply(MonacoThemeCatalog.get(settings.codeEditor.monacoTheme))
      })
    } else {
      nextTarget.editor.setTheme(activeTheme.monacoThemeName)
      listener(activeTheme)
    }

    return () => {
      listeners.delete(listener)
      if (listeners.size > 0) return

      unsubscribeSettings?.()
      unsubscribeSettings = null
      target = null
    }
  }
}

export default MonacoThemeController
