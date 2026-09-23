import ElementRegistry from '@system/workspace/element-definition/element-registry'
import type TreeNode from '@system/model/tree/tree-node'
import type ElementSearchTypes from './element-search-types'

namespace ElementSearchCatalog {
  export const create = (
    rootNode: TreeNode.Node,
    mode: ElementSearchTypes.Mode = 'element-id',
  ): ElementSearchTypes.Entry[] => {
    const entries: ElementSearchTypes.Entry[] = []

    const collect = (
      node: TreeNode.Node,
      ancestorIds: readonly number[],
    ) => {
      const addressIds = [...ancestorIds, node.id]
      const idText = mode === 'node-id'
        ? `node-${node.id}`
        : ElementRegistry.getSearchIdText(node.element)
      if (idText != null) {
        entries.push({
          nodeId: node.id,
          kind: node.element.kind,
          normalizedKind: node.element.kind.toLowerCase(),
          address: addressIds.join('.'),
          idText,
          normalizedIdText: idText.toLowerCase(),
        })
      }

      node.children.forEach((child) => collect(child, addressIds))
    }

    collect(rootNode, [])
    return entries
  }
}

export default ElementSearchCatalog
