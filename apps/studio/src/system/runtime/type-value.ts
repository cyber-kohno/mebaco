import TypeExpression from '../element/kind/type/type-expression'
import type TreeNode from '../tree/tree-node'
import TypeCatalog from '../element/kind/type/type-catalog'

namespace TypeValue {
  const isObject = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  )

  const isCompatibleBase = (
    base: TypeExpression.Base,
    value: unknown,
    rootNode?: TreeNode.Node,
    visiting: ReadonlySet<string> = new Set(),
  ): boolean => {
    switch (base.type) {
      case 'string':
        return typeof value === 'string'
          && (base.literals == null || base.literals.includes(value))
      case 'number':
        return typeof value === 'number'
          && Number.isFinite(value)
          && (base.literals == null || base.literals.includes(value))
      case 'boolean':
        return typeof value === 'boolean'
      case 'reference':
        if (!isObject(value)) return false
        if (rootNode == null) return true
        return base.objectTypeIds.some((objectTypeId) => {
          if (visiting.has(objectTypeId)) return true
          const entry = TypeCatalog.findObject(rootNode, objectTypeId)
          if (entry == null) return false
          const nextVisiting = new Set([...visiting, objectTypeId])
          const inherited = entry.element.baseObjectIds.every((baseObjectTypeId) => (
            isCompatibleBase(
              TypeExpression.createReference([baseObjectTypeId]),
              value,
              rootNode,
              nextVisiting,
            )
          ))
          return inherited && isCompatibleProperties(
            entry.element.properties,
            value,
            rootNode,
            nextVisiting,
          )
        })
      case 'named': {
        if (rootNode == null) return true
        const entry = TypeCatalog.findNamedType(rootNode, base.namedTypeId)
        if (entry == null) return false
        if (entry.element.kind === 'signature-type') return typeof value === 'function'
        if (entry.element.kind !== 'union-type') return false
        if (entry.element.definition.type === 'literal') {
          return entry.element.definition.values.includes(value as string | number)
        }
        if (!isObject(value)) return false
        return entry.element.definition.objectTypeIds.some((objectTypeId) => (
          isCompatibleBase(
            TypeExpression.createReference([objectTypeId]),
            value,
            rootNode,
            visiting,
          )
        ))
      }
      case 'object':
        if (!isObject(value)) return false
        return isCompatibleProperties(base.properties, value, rootNode, visiting)
    }
  }

  const isCompatibleProperties = (
    properties: readonly TypeExpression.Property[],
    value: Record<string, unknown>,
    rootNode?: TreeNode.Node,
    visiting: ReadonlySet<string> = new Set(),
  ): boolean => properties.every((property) => {
    if (!(property.id in value)) return property.optional
    const propertyValue = value[property.id]
    return propertyValue === null
      ? property.nullable
      : isCompatible(property.valueType, propertyValue, rootNode, visiting)
  })

  export const isCompatible = (
    expression: TypeExpression.Expression,
    value: unknown,
    rootNode?: TreeNode.Node,
    visiting: ReadonlySet<string> = new Set(),
  ): boolean => {
    if (expression.type !== 'array') {
      return isCompatibleBase(expression, value, rootNode, visiting)
    }
    return Array.isArray(value)
      && value.every((item) => isCompatible(expression.item, item, rootNode, visiting))
  }
}

export default TypeValue
