import { describe, expect, it } from 'vitest'
import TagEventCatalog from './tag-event-catalog'

describe('TagEventCatalog', () => {
  it.each([
    ['input', 'HTMLInputElement'],
    ['textarea', 'HTMLTextAreaElement'],
    ['select', 'HTMLSelectElement'],
  ])('narrows change targets for %s', (tagName, targetType) => {
    expect(TagEventCatalog.getEventType('change', tagName)).toBe(
      `Event & { readonly target: ${targetType}; readonly currentTarget: ${targetType} }`,
    )
  })

  it('keeps unrelated event targets broad', () => {
    expect(TagEventCatalog.getEventType('click', 'input')).toBe('MouseEvent')
    expect(TagEventCatalog.getEventType('change', 'div')).toBe('Event')
  })
})
