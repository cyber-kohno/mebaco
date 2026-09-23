import SignatureDefinition from './signature-definition'

namespace SignatureType {
  export type Kind = 'signature-type'

  export type Element = {
    kind: Kind
    typeId: string
    id: string
    async: boolean
    parameters: SignatureDefinition.Parameter[]
    returnType: SignatureDefinition.Definition['returnType']
  }

  const createTypeId = (): string => globalThis.crypto.randomUUID()

  export const create = (
    id: string,
    definition: SignatureDefinition.Definition = SignatureDefinition.create(),
    typeId = createTypeId(),
  ): Element => ({
    kind: 'signature-type',
    typeId,
    id,
    async: definition.async,
    parameters: definition.parameters,
    returnType: definition.returnType,
  })
}

export default SignatureType
