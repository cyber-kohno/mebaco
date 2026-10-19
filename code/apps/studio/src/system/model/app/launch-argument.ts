import TypeExpression from '@system/model/type-system/type-expression'
import type ValueSource from '@system/model/value/value-source'

namespace LaunchArgument {
  export type Kind = 'launch-argument'

  export type Element = {
    kind: Kind
    propId: string
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
    defaultValue?: ValueSource.Value
  }

  export const create = (
    id = '...',
    propId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'launch-argument',
    propId,
    id,
    valueType: TypeExpression.createPrimitive(),
    nullable: false,
  })
}

export default LaunchArgument
