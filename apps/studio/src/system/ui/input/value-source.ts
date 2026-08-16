namespace ValueSource {
  export type Value =
    | {
        type: 'default'
      }
    | {
        type: 'literal'
        value: string
      }
    | {
        type: 'formula'
        source: string
      }

  export const createDefault = (): Value => ({
    type: 'default',
  })

  export const parse = (
    source: string,
  ): Value | null => {
    try {
      const parsed = JSON.parse(source) as {
        type?: unknown
        value?: unknown
        source?: unknown
      }
      if (parsed.type === 'default') return createDefault()
      if (parsed.type === 'literal' && typeof parsed.value === 'string') {
        return { type: 'literal', value: parsed.value }
      }
      if (parsed.type === 'formula' && typeof parsed.source === 'string') {
        return { type: 'formula', source: parsed.source }
      }
      return null
    } catch {
      return null
    }
  }

  export const stringify = (
    value: Value,
  ): string => JSON.stringify(value)
}

export default ValueSource
