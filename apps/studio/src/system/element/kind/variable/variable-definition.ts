import TypeExpression from '../type/type-expression'

namespace VariableDefinition {

  export type InitialValue =
    | {
      type: 'default'
    }
    | {
      type: 'literal'
      value: string
    }
    | {
      type: 'formula'
      source: string
    }

  export type Definition = {
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
    initial: InitialValue
  }

  export const createDefaultInitial = (): InitialValue => ({
    type: 'default',
  })

  export const getInitialType = (
    initial: InitialValue,
  ): InitialValue['type'] => initial.type

  export const getTypeText = (
    definition: Definition,
    resolveObjectName?: (objectTypeId: string) => string | undefined,
  ): string => {
    const valueType = TypeExpression.getTypeText(definition.valueType, resolveObjectName)
    return `${valueType}${definition.nullable ? ' | null' : ''}`
  }
}

export default VariableDefinition
