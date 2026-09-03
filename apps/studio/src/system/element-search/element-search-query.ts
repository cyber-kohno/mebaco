import type ElementSearchTypes from './element-search-types'

namespace ElementSearchQuery {
  const parseFilter = (
    token: string,
  ): ElementSearchTypes.Filter => {
    const exact = token.startsWith('!')
    const text = exact ? token.slice(1) : token
    return {
      exact,
      text,
      normalizedText: text.toLowerCase(),
    }
  }

  export const parse = (
    source: string,
  ): ElementSearchTypes.Query => {
    const tokens = source.split(' ')
    return {
      id: parseFilter(tokens[0] ?? ''),
      kind: parseFilter(tokens[1] ?? ''),
    }
  }

  const matches = (
    candidate: string,
    filter: ElementSearchTypes.Filter,
  ): boolean => {
    if (filter.normalizedText.length === 0) return true
    return filter.exact
      ? candidate === filter.normalizedText
      : candidate.includes(filter.normalizedText)
  }

  export const filter = (
    entries: readonly ElementSearchTypes.Entry[],
    source: string,
  ): ElementSearchTypes.Entry[] => {
    const query = parse(source)
    return entries.filter((entry) => (
      matches(entry.normalizedIdText, query.id)
      && matches(entry.normalizedKind, query.kind)
    ))
  }

  export const highlight = (
    text: string,
    searchText: string,
  ): ElementSearchTypes.HighlightSegment[] => {
    if (searchText.length === 0) return [{ text, highlighted: false }]

    const normalizedText = text.toLowerCase()
    const normalizedSearchText = searchText.toLowerCase()
    const segments: ElementSearchTypes.HighlightSegment[] = []
    let offset = 0

    while (offset < text.length) {
      const matchIndex = normalizedText.indexOf(normalizedSearchText, offset)
      if (matchIndex < 0) {
        segments.push({ text: text.slice(offset), highlighted: false })
        break
      }
      if (matchIndex > offset) {
        segments.push({ text: text.slice(offset, matchIndex), highlighted: false })
      }
      const matchEnd = matchIndex + searchText.length
      segments.push({
        text: text.slice(matchIndex, matchEnd),
        highlighted: true,
      })
      offset = matchEnd
    }

    return segments.length > 0 ? segments : [{ text, highlighted: false }]
  }
}

export default ElementSearchQuery
