import type VariableDefinition from './variable-definition'

namespace State {
  export type Kind = 'state'
  export type Element = VariableDefinition.Definition & { kind: Kind }

  export const create = (
    definition: VariableDefinition.Definition,
  ): Element => ({ kind: 'state', ...definition })
}

export default State
