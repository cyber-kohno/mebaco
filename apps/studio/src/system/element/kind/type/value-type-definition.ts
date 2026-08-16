import TypeExpression from './type-expression'

namespace ValueTypeDefinition {
  export type Definition = {
    valueType: TypeExpression.Expression
    nullable: boolean
  }

  export const create = (
    valueType: TypeExpression.Expression = TypeExpression.createPrimitive(),
    nullable = false,
  ): Definition => ({
    valueType,
    nullable,
  })

  export const stringify = (
    definition: Definition,
  ): string => JSON.stringify(definition)

  export const parse = (
    source: string,
  ): Definition | null => {
    try {
      const parsed = JSON.parse(source) as {
        valueType?: unknown
        nullable?: unknown
      }
      if (parsed == null || typeof parsed !== 'object') return null
      const valueType = TypeExpression.parseExpression(JSON.stringify(parsed.valueType))
      return valueType == null || typeof parsed.nullable !== 'boolean'
        ? null
        : { valueType, nullable: parsed.nullable }
    } catch {
      return null
    }
  }

  export const getBaseType = (
    definition: Definition,
  ): TypeExpression.BaseType => TypeExpression.unwrapArray(definition.valueType).base.type

  export const getArrayDepth = (
    definition: Definition,
  ): number => TypeExpression.unwrapArray(definition.valueType).depth
}

export default ValueTypeDefinition
