import type VariableDefinition from '@system/model/variable/variable-definition'

namespace StorageItem {
  export type Kind = 'key-value'
  export type Element = VariableDefinition.Definition & {
    kind: Kind
    storageId: string
  }

  export const create = (
    definition: VariableDefinition.Definition,
    storageId: string = crypto.randomUUID(),
  ): Element => ({ ...definition, kind: 'key-value', storageId })
}

export default StorageItem
