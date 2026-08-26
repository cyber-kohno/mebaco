import LiteralUnion from './literal-union'
import TypeLiteralLabel from './type-literal-label'

namespace TypeExpression {
  export const primitiveTypes = ['string', 'number', 'boolean'] as const
  export type PrimitiveName = (typeof primitiveTypes)[number]

  export type StringPrimitive = {
    type: 'string'
    literals?: string[]
  }

  export type NumberPrimitive = {
    type: 'number'
    literals?: number[]
  }

  export type BooleanPrimitive = {
    type: 'boolean'
  }

  export type Primitive = StringPrimitive | NumberPrimitive | BooleanPrimitive

  export type Object = {
    type: 'object'
    properties: Property[]
  }

  export type Reference = {
    type: 'reference'
    objectTypeIds: string[]
  }

  export type Named = {
    type: 'named'
    namedTypeId: string
    namedTypeKind?: 'union' | 'signature'
  }

  export type Array = {
    type: 'array'
    item: Expression
  }

  export type Base = Primitive | Object | Reference | Named
  export type Expression = Base | Array
  export type BaseType = Base['type']

  export type Property = {
    id: string
    valueType: Expression
    optional: boolean
    nullable: boolean
  }

  export const getBaseTypeLabel = (type: BaseType): string => {
    if (type === 'object') return 'Object (inline)'
    if (type === 'reference') return 'Object'
    if (type === 'named') return 'Union'
    return type
  }

  export const createPrimitive = (type: PrimitiveName = 'string'): Primitive => {
    switch (type) {
      case 'string':
        return { type: 'string' }
      case 'number':
        return { type: 'number' }
      case 'boolean':
        return { type: 'boolean' }
    }
  }

  export const createReference = (objectTypeIds: string[] = ['']): Reference => ({
    type: 'reference',
    objectTypeIds,
  })

  export const createNamed = (
    namedTypeId = '',
    namedTypeKind: NonNullable<Named['namedTypeKind']> = 'union',
  ): Named => namedTypeKind === 'signature'
    ? { type: 'named', namedTypeId, namedTypeKind }
    : { type: 'named', namedTypeId }

  export const createObject = (properties: Property[] = []): Object => ({
    type: 'object',
    properties,
  })

  export const createProperty = (
    id: string,
    valueType: Expression = createPrimitive(),
  ): Property => ({ id, valueType, optional: false, nullable: false })

  export const wrapArray = (
    base: Base,
    depth: number,
  ): Expression => {
    let expression: Expression = base
    for (let index = 0; index < depth; index += 1) {
      expression = { type: 'array', item: expression }
    }
    return expression
  }

  export const unwrapArray = (
    expression: Expression,
  ): { base: Base; depth: number } => {
    let current = expression
    let depth = 0
    while (current.type === 'array') {
      current = current.item
      depth += 1
    }
    return { base: current, depth }
  }

  export const isInlineObject = (expression: Expression): boolean => (
    unwrapArray(expression).base.type === 'object'
  )

  export const getReferenceIds = (expression: Expression): readonly string[] => {
    const base = unwrapArray(expression).base
    return base.type === 'reference' ? base.objectTypeIds : []
  }

  export const getNamedTypeIds = (expression: Expression): readonly string[] => {
    const base = unwrapArray(expression).base
    if (base.type === 'named') return [base.namedTypeId]
    if (base.type === 'object') {
      return base.properties.flatMap((property) => getNamedTypeIds(property.valueType))
    }
    return []
  }

  export const getTypeText = (
    expression: Expression,
    resolveTypeName: (typeId: string) => string | undefined = () => undefined,
  ): string => {
    const { base, depth } = unwrapArray(expression)
    let baseText: string
    if (base.type === 'reference') {
      baseText = base.objectTypeIds
        .map((objectTypeId) => resolveTypeName(objectTypeId) ?? 'MissingObject')
        .join(' | ')
    } else if (base.type === 'named') {
      baseText = resolveTypeName(base.namedTypeId) ?? 'MissingType'
    } else if (base.type === 'object') {
      baseText = `{ ${base.properties.map((property) => {
        const propertyTypeText = getTypeText(property.valueType, resolveTypeName)
        return `${property.id}${property.optional ? '?' : ''}: ${propertyTypeText}${property.nullable ? ' | null' : ''};`
      }).join(' ')} }`
    } else if (base.type === 'string' && base.literals != null) {
      baseText = base.literals.map(TypeLiteralLabel.format).join(' | ')
    } else if (base.type === 'number' && base.literals != null) {
      baseText = base.literals.join(' | ')
    } else {
      baseText = base.type
    }

    const needsParentheses = depth > 0 && (
      base.type === 'reference' && base.objectTypeIds.length > 1
      || base.type === 'string' && base.literals != null && base.literals.length > 1
      || base.type === 'number' && base.literals != null && base.literals.length > 1
      || base.type === 'object'
    )
    return `${needsParentheses ? `(${baseText})` : baseText}${'[]'.repeat(depth)}`
  }

  export const parseProperties = (source: string): Property[] | null => {
    try {
      const parsed: unknown = JSON.parse(source)
      return Array.isArray(parsed) && parsed.every(isProperty)
        ? parsed
        : null
    } catch {
      return null
    }
  }

  export const parseExpression = (source: string): Expression | null => {
    try {
      const parsed: unknown = JSON.parse(source)
      return isExpression(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  const isProperty = (value: unknown): value is Property => {
    if (value == null || typeof value !== 'object') return false
    const property = value as {
      id?: unknown
      valueType?: unknown
      optional?: unknown
      nullable?: unknown
    }
    return (
      typeof property.id === 'string'
      && typeof property.optional === 'boolean'
      && typeof property.nullable === 'boolean'
      && isExpression(property.valueType)
    )
  }

  const isExpression = (value: unknown): value is Expression => {
    if (value == null || typeof value !== 'object') return false
    const expression = value as {
      type?: unknown
      properties?: unknown
      objectTypeIds?: unknown
      namedTypeId?: unknown
      namedTypeKind?: unknown
      item?: unknown
      literals?: unknown
    }
    if (expression.type === 'string') {
      return expression.literals == null || (
        Array.isArray(expression.literals)
        && expression.literals.every((literal) => typeof literal === 'string')
      )
    }
    if (expression.type === 'number') {
      return expression.literals == null || (
        Array.isArray(expression.literals)
        && expression.literals.every((literal) => (
          typeof literal === 'number' && Number.isFinite(literal)
        ))
      )
    }
    if (expression.type === 'boolean') return expression.literals == null
    if (expression.type === 'reference') {
      return Array.isArray(expression.objectTypeIds)
        && expression.objectTypeIds.every((objectTypeId) => typeof objectTypeId === 'string')
    }
    if (expression.type === 'named') {
      return typeof expression.namedTypeId === 'string'
        && (
          expression.namedTypeKind == null
          || expression.namedTypeKind === 'union'
          || expression.namedTypeKind === 'signature'
        )
    }
    if (expression.type === 'array') return isExpression(expression.item)
    return expression.type === 'object'
      && Array.isArray(expression.properties)
      && expression.properties.every(isProperty)
  }

  export const validateProperties = (
    properties: readonly Property[],
    validReferenceIds?: ReadonlySet<string>,
    validNamedTypeIds?: ReadonlySet<string>,
  ): string | null => {
    const validateLevel = (level: readonly Property[]): string | null => {
      const ids = level.map((property) => property.id)
      if (new Set(ids).size !== ids.length) return 'Property name is duplicated.'

      for (const property of level) {
        if (!/^[a-z][A-Za-z0-9]*$/.test(property.id)) {
          return 'Use valid JavaScript property names.'
        }
        const { base, depth } = unwrapArray(property.valueType)
        if (depth > 32) return 'Array depth must be 32 or fewer.'
        if (base.type === 'reference') {
          if (base.objectTypeIds.length === 0) return 'Select at least one Object.'
          if (new Set(base.objectTypeIds).size !== base.objectTypeIds.length) {
            return 'Object type is duplicated.'
          }
          if (
            validReferenceIds != null
            && base.objectTypeIds.some((objectTypeId) => !validReferenceIds.has(objectTypeId))
          ) return 'Select a valid Object reference.'
        }
        if (base.type === 'named') {
          if (base.namedTypeId.length === 0) return 'Select a valid named type.'
          if (
            validNamedTypeIds != null
            && !validNamedTypeIds.has(base.namedTypeId)
          ) return 'Select a valid named type.'
        }
        if (base.type === 'string' && base.literals != null) {
          if (base.literals.length === 0) return 'Add at least one string literal.'
          if (base.literals.some((literal) => LiteralUnion.validateTextLength(literal) != null)) {
            return `String literal must be ${LiteralUnion.maxTextLength} characters or fewer.`
          }
          if (new Set(base.literals).size !== base.literals.length) {
            return 'String literal is duplicated.'
          }
        }
        if (base.type === 'number' && base.literals != null) {
          if (base.literals.length === 0) return 'Add at least one number literal.'
          if (new Set(base.literals).size !== base.literals.length) {
            return 'Number literal is duplicated.'
          }
        }
        if (base.type === 'object') {
          const error = validateLevel(base.properties)
          if (error != null) return error
        }
      }
      return null
    }

    return validateLevel(properties)
  }
}

export default TypeExpression
