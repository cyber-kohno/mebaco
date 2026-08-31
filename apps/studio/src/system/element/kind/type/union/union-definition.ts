import type ObjectShape from '../object/object-shape'
import LiteralUnion from './literal-union'
import TypeLiteralLabel from '../type-literal-label'

namespace UnionDefinition {
  export type LiteralValueType = 'string' | 'number'

  export type Literal = {
    type: 'literal'
    valueType: LiteralValueType
    values: Array<string | number>
  }

  export type Object = {
    type: 'object'
    objectTypeIds: string[]
  }

  export type Definition = Literal | Object

  export const createLiteral = (
    valueType: LiteralValueType = 'string',
    values: Array<string | number> = [],
  ): Literal => ({
    type: 'literal',
    valueType,
    values,
  })

  export const createObject = (
    objectTypeIds: string[] = [''],
  ): Object => ({
    type: 'object',
    objectTypeIds,
  })

  export const create = (): Definition => createLiteral()

  export const stringify = (definition: Definition): string => (
    JSON.stringify(definition)
  )

  export const parse = (value: string): Definition | null => {
    try {
      const parsed = JSON.parse(value)
      return isDefinition(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  const isDefinition = (value: unknown): value is Definition => {
    if (value == null || typeof value !== 'object') return false
    const candidate = value as {
      type?: unknown
      valueType?: unknown
      values?: unknown
      objectTypeIds?: unknown
    }

    if (candidate.type === 'literal') {
      if (candidate.valueType !== 'string' && candidate.valueType !== 'number') return false
      if (!Array.isArray(candidate.values)) return false
      return candidate.valueType === 'string'
        ? candidate.values.every((item) => typeof item === 'string')
        : candidate.values.every((item) => (
            typeof item === 'number' && Number.isFinite(item)
          ))
    }

    return candidate.type === 'object'
      && Array.isArray(candidate.objectTypeIds)
      && candidate.objectTypeIds.every((item) => typeof item === 'string')
  }

  export const validate = (
    definition: Definition,
    objectOptions: readonly ObjectShape.ObjectOption[],
  ): string | null => {
    if (definition.type === 'object') {
      const validIds = new Set(objectOptions.map((option) => option.value))
      if (definition.objectTypeIds.length === 0) return 'Add at least one Object.'
      if (definition.objectTypeIds.some((id) => id.length === 0 || !validIds.has(id))) {
        return 'Select all Objects.'
      }
      if (new Set(definition.objectTypeIds).size !== definition.objectTypeIds.length) {
        return 'Object type is duplicated.'
      }
      return null
    }

    if (definition.values.length === 0) return 'Add at least one literal.'
    if (
      definition.valueType === 'string'
      && definition.values.some((value) => (
        typeof value === 'string'
        && LiteralUnion.validateTextLength(value) != null
      ))
    ) return `Literal must be ${LiteralUnion.maxTextLength} characters or fewer.`
    if (new Set(definition.values).size !== definition.values.length) {
      return 'Literal is duplicated.'
    }
    return null
  }

  export const getTypeLabel = (definition: Definition): string => (
    definition.type === 'object' ? 'Object Union' : 'Literal Union'
  )

  export const getTypeScriptType = (
    definition: Definition,
    resolveObjectName: (objectTypeId: string) => string | undefined,
  ): string => {
    if (definition.type === 'object') {
      return definition.objectTypeIds
        .map((objectTypeId) => resolveObjectName(objectTypeId) ?? 'unknown')
        .join(' | ')
    }

    return definition.valueType === 'string'
      ? definition.values.map(TypeLiteralLabel.format).join(' | ')
      : definition.values.join(' | ')
  }
}

export default UnionDefinition
