import TypeExpression from '../type-expression'
import ValueTypeDefinition from '../value-type-definition'
import DefinitionMemberDiff from '../definition-member-diff'

namespace SignatureDefinition {
  export type Parameter = {
    parameterId: string
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
  }

  export type Definition = {
    async: boolean
    parameters: Parameter[]
    returnType: ValueTypeDefinition.Definition | null
  }

  export const createParameter = (
    id: string,
    valueType: TypeExpression.Expression = TypeExpression.createPrimitive(),
    nullable = false,
    parameterId: string = crypto.randomUUID(),
  ): Parameter => ({ parameterId, id, valueType, nullable })

  export const diffParameters = (
    previous: readonly Parameter[],
    current: readonly Parameter[],
  ): DefinitionMemberDiff.Result<Parameter> => DefinitionMemberDiff.compare(
    previous,
    current,
    (parameter) => parameter.parameterId,
  )

  export const create = (
    async = false,
    parameters: Parameter[] = [],
    returnType: ValueTypeDefinition.Definition | null = null,
  ): Definition => ({ async, parameters, returnType })

  export const stringify = (definition: Definition): string => JSON.stringify(definition)

  export const parse = (source: string): Definition | null => {
    try {
      const parsed = JSON.parse(source) as {
        async?: unknown
        parameters?: unknown
        returnType?: unknown
      }
      if (parsed == null || typeof parsed !== 'object') return null
      if (typeof parsed.async !== 'boolean') return null
      if (!Array.isArray(parsed.parameters)) return null

      const parameters: Parameter[] = []
      for (const value of parsed.parameters) {
        if (value == null || typeof value !== 'object') return null
        const candidate = value as {
          parameterId?: unknown
          id?: unknown
          valueType?: unknown
          nullable?: unknown
        }
        const valueType = TypeExpression.parseExpression(JSON.stringify(candidate.valueType))
        if (
          typeof candidate.parameterId !== 'string'
          || candidate.parameterId.length === 0
          || typeof candidate.id !== 'string'
          || valueType == null
          || typeof candidate.nullable !== 'boolean'
        ) return null
        parameters.push({
          parameterId: candidate.parameterId,
          id: candidate.id,
          valueType,
          nullable: candidate.nullable,
        })
      }

      if (new Set(parameters.map((parameter) => parameter.parameterId)).size !== parameters.length) {
        return null
      }

      const returnType = parsed.returnType === null
        ? null
        : ValueTypeDefinition.parse(JSON.stringify(parsed.returnType))
      return parsed.returnType !== null && returnType == null
        ? null
        : { async: parsed.async, parameters, returnType }
    } catch {
      return null
    }
  }

  export const validate = (
    definition: Definition,
    objectOptions: readonly { value: string }[],
    namedTypeOptions: readonly { value: string }[],
  ): string | null => {
    const error = TypeExpression.validateProperties(
      definition.parameters.map((parameter) => ({
        propertyId: parameter.parameterId,
        id: parameter.id,
        valueType: parameter.valueType,
        optional: false,
        nullable: parameter.nullable,
      })),
      new Set(objectOptions.map((option) => option.value)),
      new Set(namedTypeOptions.map((option) => option.value)),
    )
    if (error != null) {
      return error.replaceAll('Property', 'Parameter').replaceAll('property', 'parameter')
    }

    if (definition.returnType == null) return null
    const returnError = TypeExpression.validateProperties(
      [{
        propertyId: 'signature-return-value',
        id: 'returnValue',
        valueType: definition.returnType.valueType,
        optional: false,
        nullable: definition.returnType.nullable,
      }],
      new Set(objectOptions.map((option) => option.value)),
      new Set(namedTypeOptions.map((option) => option.value)),
    )
    return returnError == null
      ? null
      : `Return type: ${returnError}`
  }

  export const getTypeText = (
    definition: Definition,
    resolveTypeName: (typeId: string) => string | undefined = () => undefined,
  ): string => {
    const parameters = definition.parameters.map((parameter) => {
      const valueType = TypeExpression.getTypeText(parameter.valueType, resolveTypeName)
      return `${parameter.id}: ${valueType}${parameter.nullable ? ' | null' : ''}`
    }).join(', ')
    const resolvedReturnType = definition.returnType == null
      ? 'void'
      : ValueTypeDefinition.getTypeText(definition.returnType, resolveTypeName)
    const returnType = definition.async ? `Promise<${resolvedReturnType}>` : resolvedReturnType
    return `(${parameters}) => ${returnType}`
  }
}

export default SignatureDefinition
