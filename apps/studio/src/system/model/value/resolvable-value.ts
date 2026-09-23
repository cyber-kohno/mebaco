namespace ResolvableValue {
  export type Literal<T> = {
    type: 'literal'
    value: T
  }

  export type Formula = {
    type: 'formula'
    source: string
  }

  export type Value<T> = Literal<T> | Formula

  export const createLiteral = <T>(value: T): Literal<T> => ({
    type: 'literal',
    value,
  })

  export const createFormula = (source: string): Formula => ({
    type: 'formula',
    source,
  })

  export const parse = <T>(
    value: unknown,
    isLiteral: (candidate: unknown) => candidate is T,
  ): Value<T> | null => {
    if (value == null || typeof value !== 'object') return null

    const candidate = value as {
      type?: unknown
      value?: unknown
      source?: unknown
    }
    if (candidate.type === 'literal' && isLiteral(candidate.value)) {
      return createLiteral(candidate.value)
    }
    if (candidate.type === 'formula' && typeof candidate.source === 'string') {
      return createFormula(candidate.source)
    }
    return null
  }

  export const parseJson = <T>(
    source: string,
    isLiteral: (candidate: unknown) => candidate is T,
  ): Value<T> | null => {
    try {
      return parse(JSON.parse(source), isLiteral)
    } catch {
      return null
    }
  }

  export const stringify = <T>(value: Value<T>): string => JSON.stringify(value)
}

export default ResolvableValue
