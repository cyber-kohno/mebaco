import TypeExpression from '../type-expression'

namespace ObjectType {
  export type Kind = 'object-type'

  export type Element = {
    kind: Kind
    typeId: string
    id: string
    baseObjectIds: string[]
    properties: TypeExpression.Property[]
  }

  const createTypeId = (): string => globalThis.crypto.randomUUID()

  export const create = (
    id: string,
    typeId = createTypeId(),
    properties: TypeExpression.Property[] = [],
    baseObjectIds: string[] = [],
  ): Element => ({
    kind: 'object-type',
    typeId,
    id,
    baseObjectIds,
    properties,
  })
}

export default ObjectType
