import { describe, expect, it } from 'vitest'
import MonacoThemeCatalog from './monaco-theme-catalog'

describe('MonacoThemeCatalog', () => {
  it('provides unique application and Monaco theme names', () => {
    const ids = MonacoThemeCatalog.themes.map((theme) => theme.id)
    const monacoNames = MonacoThemeCatalog.themes.map(
      (theme) => theme.monacoThemeName,
    )

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(monacoNames).size).toBe(monacoNames.length)
  })

  it('recognizes catalog ids and falls back for an unavailable theme', () => {
    expect(MonacoThemeCatalog.isId('midnight-blue')).toBe(true)
    expect(MonacoThemeCatalog.isId('unknown')).toBe(false)
    expect(MonacoThemeCatalog.get('midnight-blue').label).toBe('Midnight Blue')
    expect(MonacoThemeCatalog.get('unknown' as MonacoThemeCatalog.Id).id)
      .toBe(MonacoThemeCatalog.defaultId)
  })
})
