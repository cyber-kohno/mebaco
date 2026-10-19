namespace StyleParam {
  export type Kind = 'style-param'
  export const valueTypes = ['string', 'number', 'boolean', 'color'] as const
  export type ValueType = (typeof valueTypes)[number]
  export type Literal = string | number | boolean

  export type Element = {
    kind: Kind
    parameterId: string
    id: string
    valueType: ValueType
    defaultValue?: Literal
  }

  export const create = (
    id: string,
    valueType: ValueType,
    defaultValue?: Literal,
    parameterId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'style-param',
    parameterId,
    id,
    valueType,
    defaultValue,
  })
}

export default StyleParam
