import TypeExpression from '../type-expression'
import ObjectInheritance from './object-inheritance'

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

  export type ShapeIssue = {
    type: 'shape'
    message: string
  }

  export type ValidationIssue = ShapeIssue | ObjectInheritance.Issue

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

  export const inspect = (
    shape: Shape,
    objectOptions: readonly ObjectOption[],
    namedTypeOptions: readonly { value: string }[] = [],
  ): ValidationIssue | null => {
    const validIds = new Set(objectOptions.map((option) => option.value))
    const validNamedIds = new Set(namedTypeOptions.map((option) => option.value))
    const invalidBaseIds = shape.baseObjectIds.filter((id) => id.length === 0 || !validIds.has(id))
    if (invalidBaseIds.length > 0) {
      return {
        type: 'unavailable-base',
        message: 'Select all Base Objects.',
        baseObjectIds: invalidBaseIds,
      }
    }

    const ownError = TypeExpression.validateProperties(shape.properties, validIds, validNamedIds)
    if (ownError != null) return { type: 'shape', message: ownError }

    const optionsById = new Map(objectOptions.map((option) => [option.value, option]))
    return ObjectInheritance.analyze(
      shape.baseObjectIds,
      shape.properties,
      (objectId) => optionsById.get(objectId) ?? null,
    ).issue
  }

  export const validate = (
    shape: Shape,
    objectOptions: readonly ObjectOption[],
    namedTypeOptions: readonly { value: string }[] = [],
  ): string | null => {
    return inspect(shape, objectOptions, namedTypeOptions)?.message ?? null
  }
}

export default ObjectShape
