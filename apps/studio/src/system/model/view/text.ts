import ResolvableValue from '@system/model/value/resolvable-value'

namespace Text {
  export type Kind = 'text'
  export type Source = ResolvableValue.Value<string>

  export type Element = {
    kind: Kind
    source: Source
  }

  export const createLiteral = (
    value: string,
  ): Element => ({
    kind: 'text',
    source: ResolvableValue.createLiteral(value),
  })

  export const createFormula = (
    source: string,
  ): Element => ({
    kind: 'text',
    source: ResolvableValue.createFormula(source),
  })

  export const parseSource = (source: string): Source | null => (
    ResolvableValue.parseJson(
      source,
      (value): value is string => typeof value === 'string',
    )
  )

  export const stringifySource = (source: Source): string => (
    ResolvableValue.stringify(source)
  )
}

export default Text
