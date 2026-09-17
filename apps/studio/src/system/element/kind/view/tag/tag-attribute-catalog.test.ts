import { describe, expect, it } from 'vitest'
import TagAttributeCatalog from './tag-attribute-catalog'
import TagCatalog from './tag-catalog'

describe('TagAttributeCatalog', () => {
  it('combines tag-specific and global definitions without duplicates', () => {
    TagCatalog.tagNames.forEach((tagName) => {
      const definitions = TagAttributeCatalog.getDefinitions(tagName)
      const names = definitions.map((definition) => definition.name)
      expect(new Set(names).size, tagName).toBe(names.length)
    })
  })

  it('exposes type-aware definitions for common attributes', () => {
    expect(TagAttributeCatalog.getDefinition('div', 'tabindex')).toMatchObject({
      valueType: 'number',
      scope: 'global',
    })
    expect(TagAttributeCatalog.getDefinition('input', 'checked')).toMatchObject({
      valueType: 'boolean',
      scope: 'tag',
    })
    expect(TagAttributeCatalog.getDefinition('input', 'type')?.values)
      .toContain('checkbox')
    expect(TagAttributeCatalog.getDefinition('a', 'href')).toMatchObject({
      valueType: 'url',
      scope: 'tag',
    })
  })

  it('does not offer tag-specific attributes on unrelated tags', () => {
    expect(TagAttributeCatalog.getDefinition('div', 'href')).toBeNull()
    expect(TagAttributeCatalog.getDefinition('img', 'src')).not.toBeNull()
  })

  it('includes display metadata in completion options', () => {
    expect(TagAttributeCatalog.getOptions('div')).toContainEqual(expect.objectContaining({
      value: 'tabindex',
      detail: 'number · global',
    }))
  })
})
