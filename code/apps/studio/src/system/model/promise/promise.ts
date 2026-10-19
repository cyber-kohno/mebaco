import ValueTypeDefinition from '@system/model/type-system/value-type-definition'

namespace PromiseModel {
  export type Kind = 'promise'

  export type Element = {
    kind: Kind
    id: string
    resultType: ValueTypeDefinition.Definition | null
    source: string
  }

  export const create = (
    id = 'result',
    resultType: ValueTypeDefinition.Definition | null = ValueTypeDefinition.create(),
    source = "Promise.resolve('')",
  ): Element => ({ kind: 'promise', id, resultType, source })
}

export default PromiseModel
