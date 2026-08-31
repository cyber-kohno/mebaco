import type UnionDefinition from '../type/union/union-definition'
import LiteralUnion from '../type/union/literal-union'
import TypeLiteralLabel from '../type/type-literal-label'

namespace SwitchValueType {
  export type PrimitiveName = 'string' | 'number'

  export type Literal = string | number

  export type Primitive = {
    type: 'primitive'
    primitive: PrimitiveName
    literals?: Literal[]
  }

  export type Union = {
    type: 'union'
    unionTypeId: string
  }

  export type Definition = Primitive | Union

  export type LiteralUnionOption = {
    value: string
    label: string
    valueType: PrimitiveName
    values: Literal[]
    title: string
  }

  export const createPrimitive = (
    primitive: PrimitiveName = 'string',
  ): Primitive => ({
    type: 'primitive',
    primitive,
  })

  export const createUnion = (
    unionTypeId = '',
  ): Union => ({
    type: 'union',
    unionTypeId,
  })

  export const stringify = (
    definition: Definition,
  ): string => JSON.stringify(definition)

  export const parse = (
    source: string,
  ): Definition | null => {
    try {
      const parsed: unknown = JSON.parse(source)
      return isDefinition(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  const isDefinition = (
    value: unknown,
  ): value is Definition => {
    if (value == null || typeof value !== 'object') return false
    const definition = value as Partial<Definition>
    if (definition.type === 'union') {
      return typeof definition.unionTypeId === 'string'
    }
    if (
      definition.type !== 'primitive'
      || (definition.primitive !== 'string' && definition.primitive !== 'number')
    ) return false

    return definition.literals == null || (
      Array.isArray(definition.literals)
      && definition.literals.every((literal) => (
        definition.primitive === 'string'
          ? typeof literal === 'string'
          : typeof literal === 'number' && Number.isFinite(literal)
      ))
    )
  }

  export const createFromLegacy = (
    valueType: unknown,
  ): Definition => (
    valueType === 'number'
      ? createPrimitive('number')
      : createPrimitive('string')
  )

  export const getPrimitiveName = (
    definition: Definition,
    findUnion: (unionTypeId: string) => UnionDefinition.Literal | undefined,
  ): PrimitiveName | null => {
    if (definition.type === 'primitive') return definition.primitive
    return findUnion(definition.unionTypeId)?.valueType ?? null
  }

  export const getAllowedLiterals = (
    definition: Definition,
    findUnion: (unionTypeId: string) => UnionDefinition.Literal | undefined,
  ): Literal[] | null => {
    if (definition.type === 'primitive') return definition.literals ?? null
    return findUnion(definition.unionTypeId)?.values ?? null
  }

  export const getPrimitiveNameFromOptions = (
    definition: Definition,
    literalUnionOptions: readonly LiteralUnionOption[],
  ): PrimitiveName | null => (
    definition.type === 'primitive'
      ? definition.primitive
      : literalUnionOptions.find((option) => option.value === definition.unionTypeId)?.valueType ?? null
  )

  export const getLabel = (
    definition: Definition,
    resolveUnionName: (unionTypeId: string) => string | undefined = () => undefined,
  ): string => {
    if (definition.type === 'union') {
      return `Union: ${resolveUnionName(definition.unionTypeId) ?? 'MissingUnion'}`
    }

    const literalText = definition.literals == null
      ? ''
      : ` ${definition.literals.map(TypeLiteralLabel.format).join(' | ')}`
    return `${definition.primitive}${literalText}`
  }

  export const getTypeText = (
    definition: Definition,
    literalUnionOptions: readonly LiteralUnionOption[] = [],
  ): string => {
    if (definition.type === 'union') {
      const option = literalUnionOptions.find((candidate) => (
        candidate.value === definition.unionTypeId
      ))
      return option == null
        ? 'string | number'
        : option.values.map(TypeLiteralLabel.format).join(' | ')
    }

    return definition.literals == null
      ? definition.primitive
      : definition.literals.map(TypeLiteralLabel.format).join(' | ')
  }

  export const validate = (
    definition: Definition,
    literalUnionOptions: readonly LiteralUnionOption[],
  ): string | null => {
    if (definition.type === 'union') {
      if (definition.unionTypeId.length === 0) return 'Select a Literal Union.'
      return literalUnionOptions.some((option) => option.value === definition.unionTypeId)
        ? null
        : 'Select a valid Literal Union.'
    }
    if (definition.literals == null) return null
    if (definition.literals.length === 0) return 'Add at least one literal.'
    if (
      definition.primitive === 'string'
      && definition.literals.some((literal) => (
        typeof literal === 'string'
        && LiteralUnion.validateTextLength(literal) != null
      ))
    ) return `Literal must be ${LiteralUnion.maxTextLength} characters or fewer.`
    if (new Set(definition.literals).size !== definition.literals.length) {
      return 'Literal is duplicated.'
    }
    return null
  }
}

export default SwitchValueType
