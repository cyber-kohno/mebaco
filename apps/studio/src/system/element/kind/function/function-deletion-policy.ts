import type ReferenceGraph from '../../../analysis/reference/reference-graph'
import type TreeNode from '../../../tree/tree-node'
import FunctionScope from './function-scope'
import type FunctionElement from './function-element'

namespace FunctionDeletionPolicy {
  export type FunctionNode = TreeNode.Node & { element: FunctionElement.Element }

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

  export const createRebindingBlock = (
    rootNode: TreeNode.Node,
    functionNode: FunctionNode,
    references: readonly ReferenceGraph.Reference[],
  ): { title: string; message: string[] } | null => {
    const rebindings = collectRebindings(rootNode, functionNode, references)
    if (rebindings.length === 0) return null

    const labelsBySource = new Map<string, Set<string>>()
    rebindings.forEach(({ reference, replacementNodeId }) => {
      const key = `${reference.sourceNodeId}:${replacementNodeId}`
      const labels = labelsBySource.get(key) ?? new Set<string>()
      labels.add(reference.sourceLabel)
      labelsBySource.set(key, labels)
    })
    const nodeCount = new Set(rebindings.map(({ reference }) => reference.sourceNodeId)).size
    const referenceLines = [...labelsBySource]
      .map(([key, labels]) => {
        const [sourceNodeId, replacementNodeId] = key.split(':').map(Number)
        return `node-${sourceNodeId}: ${[...labels].join(', ')} -> node-${replacementNodeId}: function.${functionNode.element.id}`
      })
      .sort((left, right) => left.localeCompare(right))

    return {
      title: 'Cannot Delete Function',
      message: [
        `Deleting this Function would redirect calls in ${nodeCount} ${nodeCount === 1 ? 'element' : 'elements'} to another Function with the same Id.`,
        ...referenceLines,
        'Change the references before deleting this Function.',
      ],
    }
  }

}

export default FunctionDeletionPolicy
