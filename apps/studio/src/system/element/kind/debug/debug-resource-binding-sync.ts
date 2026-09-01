import type TreeNode from '../../../tree/tree-node'
import DebugResourceBindingsElement from './debug-resource-bindings-element'

namespace DebugResourceBindingSync {
  const isResource = (
    element: TreeNode.Node['element'],
  ): element is Extract<TreeNode.Node['element'], {
    kind: 'directory-resource' | 'text-resource' | 'sqlite-resource'
  }> => (
    element.kind === 'directory-resource'
    || element.kind === 'text-resource'
    || element.kind === 'sqlite-resource'
  )

  export const collectResources = (
    rootNode: TreeNode.Node,
  ): DebugResourceBindingsElement.Resource[] => {
    const resources: DebugResourceBindingsElement.Resource[] = []
    const visit = (node: TreeNode.Node) => {
      if (isResource(node.element)) {
        resources.push({
          resourceId: node.element.resourceId,
          id: node.element.id,
          resourceKind: node.element.kind,
        })
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return resources
  }

  export const sync = (
    rootNode: TreeNode.Node,
  ): number => {
    const resources = collectResources(rootNode)
    let correctedNodeCount = 0
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'debug-resource-bindings') {
        const bindings = DebugResourceBindingsElement.normalizeBindings(
          node.element.bindings,
          resources,
        )
        if (JSON.stringify(bindings) !== JSON.stringify(node.element.bindings)) {
          node.element = { ...node.element, bindings }
          correctedNodeCount += 1
        }
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return correctedNodeCount
  }

  export const remove = (
    rootNode: TreeNode.Node,
    resourceIds: ReadonlySet<string>,
  ): number => {
    let correctedNodeCount = 0
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'debug-resource-bindings') {
        const bindings = node.element.bindings.filter(
          (binding) => !resourceIds.has(binding.resourceId),
        )
        if (bindings.length !== node.element.bindings.length) {
          node.element = { ...node.element, bindings }
          correctedNodeCount += 1
        }
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return correctedNodeCount
  }
}

export default DebugResourceBindingSync
