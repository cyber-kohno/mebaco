namespace StylePropertyName {
  export type Source = {
    property: string
  }

  export const normalize = (
    property: string,
  ): string => {
    const trimmed = property.trim()
    return trimmed.startsWith('--')
      ? `custom:${trimmed}`
      : `standard:${trimmed.toLowerCase()}`
  }

  export const getDuplicateKeys = (
    declarations: readonly Source[],
  ): ReadonlySet<string> => {
    const counts = new Map<string, number>()

    declarations.forEach(({ property }) => {
      if (property.trim().length === 0) return
      const key = normalize(property)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })

    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([key]) => key),
    )
  }

  export const hasDuplicates = (
    declarations: readonly Source[],
  ): boolean => getDuplicateKeys(declarations).size > 0
}

export default StylePropertyName
