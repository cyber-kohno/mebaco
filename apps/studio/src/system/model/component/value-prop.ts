import TypeExpression from '@system/model/type-system/type-expression'
import type ValueSource from '@system/model/value/value-source'

namespace ValueProp {
  export type Kind = 'value-prop'

  export type Element = {
    kind: Kind
    propId: string
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
    defaultValue?: ValueSource.Value
  }

  export const create = (
    id: string,
    valueType: TypeExpression.Expression = TypeExpression.createPrimitive(),
    nullable = false,
    defaultValue?: ValueSource.Value,
    propId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'value-prop',
    propId,
    id,
    valueType,
    nullable,
    defaultValue,
  })
}

export default ValueProp
