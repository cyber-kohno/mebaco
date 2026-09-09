import type TreeNode from '../../../../tree/tree-node'
import type StorageItemElement from '../../storage/storage-item-element'

namespace StorageImportCatalog {
  export type StorageNode = TreeNode.Node & { element: StorageItemElement.Element }
  export const collect = (rootNode: TreeNode.Node): StorageNode[] => {
    const result: StorageNode[] = []
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'key-value') result.push(node as StorageNode)
      node.children.forEach(visit)
    }
    visit(rootNode)
    return result
  }
  export const getIds = (appNode: TreeNode.Node): string[] => {
    const imports = appNode.children.find((node) => node.element.kind === 'imports')
    const storage = imports?.children.find((node) => node.element.kind === 'storage-imports')
    return storage?.element.kind === 'storage-imports' ? storage.element.storageIds : []
  }
  export const getImported = (rootNode: TreeNode.Node, appNode: TreeNode.Node): StorageNode[] => {
    const ids = new Set(getIds(appNode))
    return collect(rootNode).filter((node) => ids.has(node.element.storageId))
  }
}
export default StorageImportCatalog
