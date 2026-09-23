import type TreeNode from '@system/model/tree/tree-node'
import type DirectoryResource from '@system/model/resource/directory-resource'
import type TextResource from '@system/model/resource/text-resource'
import type SqliteResource from '@system/model/resource/sqlite-resource'
import type ResourceImports from '@system/model/app/import/resource-imports'
import TransitionImportCatalog from '@system/model/app/import/transition-import-catalog'

namespace ResourceImportCatalog {
  export type ResourceElement =
    | DirectoryResource.Element
    | TextResource.Element
    | SqliteResource.Element

  export type ResourceNode = TreeNode.Node & { element: ResourceElement }

  export const collectResources = (
    rootNode: TreeNode.Node,
  ): ResourceNode[] => {
    const resources: ResourceNode[] = []
    const visit = (node: TreeNode.Node) => {
      if (
        node.element.kind === 'directory-resource'
        || node.element.kind === 'text-resource'
        || node.element.kind === 'sqlite-resource'
      ) resources.push(node as ResourceNode)
      node.children.forEach(visit)
    }
    visit(rootNode)
    return resources
  }

  export const getResourceIds = (appNode: TreeNode.Node): readonly string[] => {
    const imports = appNode.children.find((child) => child.element.kind === 'imports')
    const resources = imports?.children.find((child) => child.element.kind === 'resource-imports')
      ?.element
    return resources?.kind === 'resource-imports'
      ? (resources as ResourceImports.Element).resourceIds
      : []
  }

  export const getImportedResources = (
    rootNode: TreeNode.Node,
    appNode: TreeNode.Node,
  ): ResourceNode[] => {
    const resourcesById = new Map(
      collectResources(rootNode).map((node) => [node.element.resourceId, node]),
    )
    return getResourceIds(appNode)
      .map((resourceId) => resourcesById.get(resourceId) ?? null)
      .filter((node): node is ResourceNode => node != null)
  }

  export const getAvailableResources = (rootNode: TreeNode.Node): ResourceNode[] => (
    collectResources(rootNode)
  )

  export const findOwnerApp = TransitionImportCatalog.findOwnerApp
}

export default ResourceImportCatalog
