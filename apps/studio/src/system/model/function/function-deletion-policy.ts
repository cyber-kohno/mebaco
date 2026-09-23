import type { ReferenceGraph } from '@system/model/reference/graph'
import type TreeNode from '@system/model/tree/tree-node'
import FunctionScope from './function-scope'
import type FunctionDefinition from './function-definition'

namespace FunctionDeletionPolicy {
  export type FunctionNode = TreeNode.Node & { element: FunctionDefinition.Element }

  export type Rebinding = {
    reference: ReferenceGraph.Reference
    replacementNodeId: number
  }

  const createRootWithoutNode = (
    rootNode: TreeNode.Node,
    removedNodeId: number,
  ): TreeNode.Node => {
    const clone = (node: TreeNode.Node): TreeNode.Node => ({
      ...node,
      children: node.children.map(clone),
    })
    const nextRoot = clone(rootNode)
    const remove = (node: TreeNode.Node): boolean => {
      const childIndex = node.children.findIndex((child) => child.id === removedNodeId)
      if (childIndex >= 0) {
        node.children.splice(childIndex, 1)
        return true
      }
      return node.children.some(remove)
    }
    if (!remove(nextRoot)) throw new Error(`node-${removedNodeId} was not found.`)
    return nextRoot
  }

  export const collectRebindings = (
    rootNode: TreeNode.Node,
    functionNode: FunctionNode,
    references: readonly ReferenceGraph.Reference[],
  ): readonly Rebinding[] => {
    const nextRoot = createRootWithoutNode(rootNode, functionNode.id)
    return references.flatMap((reference): Rebinding[] => {
      const replacement = FunctionScope.resolveFunction(
        nextRoot,
        reference.sourceNodeId,
        functionNode.element.id,
      )
      return replacement == null
        ? []
        : [{ reference, replacementNodeId: replacement.node.id }]
    })
  }

}

export default FunctionDeletionPolicy
