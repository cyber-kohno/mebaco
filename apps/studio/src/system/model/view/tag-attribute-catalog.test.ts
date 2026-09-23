import { describe, expect, it } from 'vitest'
import TagAttributeCatalog from './tag-attribute-catalog'
import TagCatalog from './tag-catalog'
import HtmlTag from '@system/model/element/html-tag'

describe('TagAttributeCatalog', () => {
  it('combines tag-specific and global definitions without duplicates', () => {
    HtmlTag.tagNames.forEach((tagName) => {
      const definitions = TagAttributeCatalog.getDefinitions(tagName)
      const names = definitions.map((definition) => definition.name)
      expect(new Set(names).size, tagName).toBe(names.length)
    })
  })

  it('exposes type-aware definitions for common attributes', () => {
    expect(TagAttributeCatalog.getDefinition('div', 'tabindex')).toMatchObject({
      primitiveType: 'number',
      editor: { type: 'text' },
      scope: 'global',
    })
    expect(TagAttributeCatalog.getDefinition('input', 'checked')).toMatchObject({
      primitiveType: 'boolean',
      scope: 'tag',
    })
    expect(TagAttributeCatalog.getDefinition('input', 'type')?.editor.type)
      .toBe('enum')
    expect((TagAttributeCatalog.getDefinition('input', 'type')?.editor as { values: readonly string[] }).values)
      .toContain('checkbox')
    expect(TagAttributeCatalog.getDefinition('a', 'href')).toMatchObject({
      primitiveType: 'string',
      editor: { type: 'url' },
      scope: 'tag',
    })
  })

  it('recognizes data attributes as dynamic string definitions', () => {
    expect(TagAttributeCatalog.getDefinition('div', 'data-item-id')).toMatchObject({
      primitiveType: 'string',
      scope: 'data',
    })
    expect(TagAttributeCatalog.getDefinition('div', 'data-')).toBeNull()
  })

  it('reserves Mebaco-owned attributes case-insensitively', () => {
    const names = [
      'class',
      'CLASS',
      'style',
      'hidden',
      'innerHTML',
      'textContent',
      'slot',
      'part',
      'border',
      'onclick',
      'on:click',
      'bind:value',
      'data-mbc-node',
      'mbc-node',
    ]

    names.forEach((name) => {
      expect(TagAttributeCatalog.resolvePolicy('div', name), name).toMatchObject({
        status: 'reserved',
      })
      expect(TagAttributeCatalog.getDefinition('div', name), name).toBeNull()
    })
  })

  it('keeps ordinary identifiers, aria attributes, and data attributes supported', () => {
    expect(TagAttributeCatalog.resolvePolicy('div', 'ID')).toMatchObject({
      status: 'supported',
      definition: { name: 'id' },
    })
    expect(TagAttributeCatalog.resolvePolicy('div', 'aria-label')).toMatchObject({
      status: 'supported',
    })
    expect(TagAttributeCatalog.resolvePolicy('div', 'data-item-id')).toMatchObject({
      status: 'supported',
    })
  })

  it('does not offer tag-specific attributes on unrelated tags', () => {
    expect(TagAttributeCatalog.getDefinition('div', 'href')).toBeNull()
    expect(TagAttributeCatalog.getDefinition('img', 'src')).not.toBeNull()
  })

  it('keeps completion rows focused on the attribute name', () => {
    expect(TagAttributeCatalog.getOptions('div')).toContainEqual(expect.objectContaining({
      value: 'tabindex',
      label: 'tabindex',
      title: 'tabindex: number · global',
    }))
    expect(TagAttributeCatalog.getOptions('div').find((option) => option.value === 'tabindex'))
      .not.toHaveProperty('detail')
  })

  it('does not offer reserved attributes in completion', () => {
    const offeredNames = TagAttributeCatalog.getOptions('div').map((option) => option.value)

    expect(offeredNames).not.toContain('class')
    expect(offeredNames).not.toContain('hidden')
    expect(offeredNames).not.toContain('part')
    expect(offeredNames).not.toContain('slot')
  })
})

describe('TagCatalog options', () => {
  it('keeps void Tags visible but disables them when children exist', () => {
    const options = TagCatalog.getOptions(true)

    expect(options.find((option) => option.value === 'div')).toMatchObject({
      value: 'div',
    })
    expect(options.find((option) => option.value === 'div')?.disabled).not.toBe(true)
    expect(options.find((option) => option.value === 'input')).toMatchObject({
      disabled: true,
      label: 'input — cannot contain children',
    })
    expect(options.find((option) => option.value === 'img')?.disabled).toBe(true)
    expect(options.find((option) => option.value === 'br')?.disabled).toBe(true)
  })

  it('allows all Tags when no children exist', () => {
    expect(TagCatalog.getOptions(false).every((option) => option.disabled !== true)).toBe(true)
  })
})
