import type TreeNode from '../../../../tree/tree-node'
import type DirectoryResourceElement from '../../resource/directory-resource-element'
import type TextResourceElement from '../../resource/text-resource-element'
import type SqliteResourceElement from '../../resource/sqlite-resource-element'
import type ResourceImportsElement from './resource-imports-element'
import TransitionImportCatalog from './transition-import-catalog'

namespace ResourceImportCatalog {
  export type ResourceElement =
    | DirectoryResourceElement.Element
    | TextResourceElement.Element
    | SqliteResourceElement.Element

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
      ? (resources as ResourceImportsElement.Element).resourceIds
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
