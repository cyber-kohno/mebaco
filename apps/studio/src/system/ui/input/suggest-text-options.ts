namespace SuggestTextOptions {
  export type Option = {
    value: string
  }

  const isTokenBoundaryMatch = (
    value: string,
    query: string,
  ): boolean => {
    let index = value.indexOf(query, 1)

    while (index >= 0) {
      if (!/[a-z0-9]/i.test(value[index - 1])) return true
      index = value.indexOf(query, index + 1)
    }

    return false
  }

  const getMatchRank = (
    value: string,
    query: string,
  ): number | null => {
    if (query.length === 0) return 0
    if (value === query) return 0
    if (value.startsWith(query)) return 1
    if (isTokenBoundaryMatch(value, query)) return 2
    if (value.includes(query)) return 3
    return null
  }

  export const getMatches = <T extends Option>(
    options: readonly T[],
    query: string,
    limit = 8,
  ): T[] => {
    if (limit <= 0) return []

    const normalizedQuery = query.toLowerCase()
    const matches: { option: T; index: number; rank: number }[] = []

    options.forEach((option, index) => {
      const rank = getMatchRank(option.value.toLowerCase(), normalizedQuery)
      if (rank != null) matches.push({ option, index, rank })
    })

    return matches
      .sort((left, right) => left.rank - right.rank || left.index - right.index)
      .slice(0, limit)
      .map(({ option }) => option)
  }
}

export default SuggestTextOptions
