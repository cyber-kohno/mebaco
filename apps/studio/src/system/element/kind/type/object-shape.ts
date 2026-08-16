import TypeExpression from './type-expression'

namespace ObjectShape {
  export type Shape = {
    baseObjectIds: string[]
    properties: TypeExpression.Property[]
  }

  export type ObjectOption = {
    value: string
    label: string
    baseObjectIds: readonly string[]
    properties: readonly TypeExpression.Property[]
  }

  export const create = (
    properties: TypeExpression.Property[] = [],
    baseObjectIds: string[] = [],
  ): Shape => ({ baseObjectIds, properties })

  export const parse = (value: string): Shape | null => {
    try {
      const parsed = JSON.parse(value) as {
        baseObjectIds?: unknown
        properties?: unknown
      }
      if (parsed == null || typeof parsed !== 'object') return null
      if (
        !Array.isArray(parsed.baseObjectIds)
        || !parsed.baseObjectIds.every((id) => typeof id === 'string')
      ) return null

      const properties = TypeExpression.parseProperties(JSON.stringify(parsed.properties))
      return properties == null
        ? null
        : { baseObjectIds: parsed.baseObjectIds, properties }
    } catch {
      return null
    }
  }

  const propertiesEqual = (
    left: TypeExpression.Property,
    right: TypeExpression.Property,
  ): boolean => JSON.stringify(left) === JSON.stringify(right)

  export const validate = (
    shape: Shape,
    objectOptions: readonly ObjectOption[],
    namedTypeOptions: readonly { value: string }[] = [],
  ): string | null => {
    const validIds = new Set(objectOptions.map((option) => option.value))
    const validNamedIds = new Set(namedTypeOptions.map((option) => option.value))
    if (shape.baseObjectIds.some((id) => id.length === 0 || !validIds.has(id))) {
      return 'Select all Base Objects.'
    }
    if (new Set(shape.baseObjectIds).size !== shape.baseObjectIds.length) {
      return 'Base Object is duplicated.'
    }

    const ownError = TypeExpression.validateProperties(shape.properties, validIds, validNamedIds)
    if (ownError != null) return ownError

    const optionsById = new Map(objectOptions.map((option) => [option.value, option]))
    const inherited = new Map<string, TypeExpression.Property>()
    const visiting = new Set<string>()

    const collect = (objectId: string): string | null => {
      if (visiting.has(objectId)) return 'Base Object inheritance is circular.'
      const option = optionsById.get(objectId)
      if (option == null) return 'Base Object is unavailable.'

      visiting.add(objectId)
      for (const baseObjectId of option.baseObjectIds) {
        const error = collect(baseObjectId)
        if (error != null) return error
      }
      visiting.delete(objectId)

      for (const property of option.properties) {
        const previous = inherited.get(property.id)
        if (previous != null && !propertiesEqual(previous, property)) {
          return `Inherited property "${property.id}" conflicts.`
        }
        inherited.set(property.id, property)
      }
      return null
    }

    for (const baseObjectId of shape.baseObjectIds) {
      const error = collect(baseObjectId)
      if (error != null) return error
    }

    const localConflict = shape.properties.find((property) => inherited.has(property.id))
    return localConflict == null
      ? null
      : `Local property "${localConflict.id}" conflicts with a Base Object.`
  }
}

export default ObjectShape
