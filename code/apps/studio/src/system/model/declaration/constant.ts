import type TypeExpression from '@system/model/type-system/type-expression'

namespace Constant {
  export type TypeSetting =
    | { type: 'inferred' }
    | { type: 'explicit'; valueType: TypeExpression.Expression; nullable: boolean }

  export type Kind = 'constant'
  export type Element = {
    kind: Kind
    id: string
    typeSetting: TypeSetting
    source: string
  }

  export const create = (
    id: string,
    typeSetting: TypeSetting,
    source: string,
  ): Element => ({ kind: 'constant', id, typeSetting, source })
}

export default Constant
