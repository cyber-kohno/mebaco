import type TypeExpression from '@system/model/type-system/type-expression'

namespace Variable {
  export type Kind = 'variable'
  export type TypeSetting =
    | { type: 'inferred' }
    | {
        type: 'explicit'
        valueType: TypeExpression.Expression
        nullable: boolean
      }

  export type Element = {
    kind: Kind
    id: string
    binding: 'const' | 'let'
    typeSetting: TypeSetting
    source: string
  }

  export const create = (
    id: string,
    binding: Element['binding'],
    typeSetting: TypeSetting,
    source: string,
  ): Element => ({ kind: 'variable', id, binding, typeSetting, source })
}

export default Variable
