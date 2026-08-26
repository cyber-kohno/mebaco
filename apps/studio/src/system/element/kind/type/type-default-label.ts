import TypeExpression from './type-expression'
import type ValueTypeDefinition from './value-type-definition'
import type UnionDefinition from './union-definition'
import type SignatureDefinition from './signature-definition'
import TypeLiteralLabel from './type-literal-label'

namespace TypeDefaultLabel {
  export type NamedType =
    | {
        kind: 'label'
        label: string
      }
    | {
        kind: 'union'
        typeId: string
        name: string
        definition: UnionDefinition.Definition
      }
    | {
        kind: 'signature'
        typeId: string
        name: string
        definition: SignatureDefinition.Definition
      }

  export type Resolver = {
    resolveObjectName: (objectTypeId: string) => string | undefined
    resolveNamedType: (namedTypeId: string) => NamedType | undefined
  }

  export type Option = {
    value: string
    label?: string
    name?: string
    literalValues?: readonly (string | number)[]
    defaultValueLabel?: string
  }

  const maxSignatureDepth = 4

  export const formatLiteral = TypeLiteralLabel.format

  const getNamedLabel = (
    namedTypeId: string,
    resolver: Resolver,
    visiting: ReadonlySet<string>,
    signatureDepth: number,
  ): string | undefined => {
    const named = resolver.resolveNamedType(namedTypeId)
    if (named == null) return undefined
    if (named.kind === 'label') return named.label

    if (named.kind === 'union') {
      if (named.definition.type === 'literal') {
        const value = named.definition.values[0]
          ?? (named.definition.valueType === 'number' ? 0 : '')
        return formatLiteral(value)
      }
      const objectName = resolver.resolveObjectName(named.definition.objectTypeIds[0] ?? '')
      return objectName == null ? undefined : `${objectName}(default)`
    }

    if (visiting.has(named.typeId) || signatureDepth >= maxSignatureDepth) {
      return `${named.name}(default)`
    }

    const nextVisiting = new Set([...visiting, named.typeId])
    const parameters = named.definition.parameters.map((parameter) => parameter.id).join(', ')
    const prefix = named.definition.async ? 'async ' : ''
    if (named.definition.returnType == null) return `${prefix}(${parameters}) => {}`

    const returnLabel = getDefinitionLabel(
      named.definition.returnType,
      resolver,
      nextVisiting,
      signatureDepth + 1,
    )
    return returnLabel == null
      ? undefined
      : `${prefix}(${parameters}) => ${returnLabel}`
  }

  const getDefinitionLabel = (
    definition: ValueTypeDefinition.Definition,
    resolver: Resolver,
    visiting: ReadonlySet<string>,
    signatureDepth: number,
  ): string | undefined => {
    if (definition.nullable) return 'null'

    const { base, depth } = TypeExpression.unwrapArray(definition.valueType)
    if (depth > 0) return '[]'

    switch (base.type) {
      case 'string':
        return formatLiteral(base.literals?.[0] ?? '')
      case 'number':
        return formatLiteral(base.literals?.[0] ?? 0)
      case 'boolean':
        return 'false'
      case 'object':
        return 'Object(default)'
      case 'reference': {
        const objectName = resolver.resolveObjectName(base.objectTypeIds[0] ?? '')
        return objectName == null ? undefined : `${objectName}(default)`
      }
      case 'named':
        return getNamedLabel(base.namedTypeId, resolver, visiting, signatureDepth)
    }
  }

  export const get = (
    definition: ValueTypeDefinition.Definition,
    resolver: Resolver,
  ): string | undefined => getDefinitionLabel(definition, resolver, new Set(), 0)

  export const getFromOptions = (
    definition: ValueTypeDefinition.Definition,
    objectOptions: readonly Option[],
    namedTypeOptions: readonly Option[],
  ): string | undefined => get(definition, {
    resolveObjectName: (objectTypeId) => (
      objectOptions.find((option) => option.value === objectTypeId)?.label
      ?? objectOptions.find((option) => option.value === objectTypeId)?.name
    ),
    resolveNamedType: (namedTypeId) => {
      const option = namedTypeOptions.find((candidate) => candidate.value === namedTypeId)
      if (option?.defaultValueLabel != null) {
        return { kind: 'label', label: option.defaultValueLabel }
      }
      const literal = option?.literalValues?.[0]
      return literal == null
        ? undefined
        : { kind: 'label', label: formatLiteral(literal) }
    },
  })
}

export default TypeDefaultLabel
