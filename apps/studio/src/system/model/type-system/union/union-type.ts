import UnionDefinition from './union-definition'

namespace UnionType {
  export type Kind = 'union-type'

  export type Element = {
    kind: Kind
    typeId: string
    id: string
    definition: UnionDefinition.Definition
  }

  const createTypeId = (): string => globalThis.crypto.randomUUID()

  export const create = (
    id: string,
    definition: UnionDefinition.Definition = UnionDefinition.create(),
    typeId = createTypeId(),
  ): Element => ({
    kind: 'union-type',
    typeId,
    id,
    definition,
  })
}

export default UnionType
