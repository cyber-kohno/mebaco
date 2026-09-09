import type TreeNode from '../../../tree/tree-node'
import TypeCatalog from '../type/type-catalog'
import type TypeExpression from '../type/type-expression'

namespace StorageTypeCatalog {
  export const isPersistable = (
    rootNode: TreeNode.Node,
    expression: TypeExpression.Expression,
    seen = new Set<string>(),
  ): boolean => {
    if (expression.type === 'array') return isPersistable(rootNode, expression.item, seen)
    if (expression.type === 'object') {
      return expression.properties.every((property) => isPersistable(rootNode, property.valueType, seen))
    }
    const typeIds = expression.type === 'reference'
      ? expression.objectTypeIds
      : expression.type === 'named' ? [expression.namedTypeId] : []
    return typeIds.every((typeId) => {
      if (seen.has(typeId)) return true
      const entry = TypeCatalog.findNamedType(rootNode, typeId)
      if (entry == null || entry.element.kind === 'signature-type') return false
      const nextSeen = new Set(seen).add(typeId)
      if (entry.element.kind === 'union-type') {
        return entry.element.definition.type === 'literal'
          || entry.element.definition.objectTypeIds.every((objectId) => isPersistable(
            rootNode, { type: 'reference', objectTypeIds: [objectId] }, nextSeen,
          ))
      }
      return entry.element.baseObjectIds.every((objectId) => isPersistable(
        rootNode, { type: 'reference', objectTypeIds: [objectId] }, nextSeen,
      )) && entry.element.properties.every((property) => isPersistable(
        rootNode, property.valueType, nextSeen,
      ))
    })
  }
}

export default StorageTypeCatalog
