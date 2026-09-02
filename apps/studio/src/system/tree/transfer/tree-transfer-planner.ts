import TreeNode from '../tree-node'
import TreeTransferCatalog from './tree-transfer-catalog'
import TreeTransferIdentity from './tree-transfer-identity'

namespace TreeTransferPlanner {
  export type CopyPlan = {
    rootNode: TreeNode.Node
    copiedNodeId: number
    nodeIds: ReadonlyMap<number, number>
  }

  const findMaxNodeId = (node: TreeNode.Node): number => node.children.reduce(
    (maximum, child) => Math.max(maximum, findMaxNodeId(child)),
    node.id,
  )

  export const copy = (
    rootNode: TreeNode.Node,
    sourceNodeId: number,
    destinationNodeId: number,
    copiedName: string | null,
  ): CopyPlan => {
    const sourceNode = TreeNode.findNode(rootNode, sourceNodeId)
    const destinationNode = TreeNode.findNode(rootNode, destinationNodeId)
    if (sourceNode == null) throw new Error(`node-${sourceNodeId} was not found.`)
    if (destinationNode == null) throw new Error(`node-${destinationNodeId} was not found.`)
    if (!TreeTransferCatalog.canPasteTo(rootNode, sourceNode, destinationNode, 'copy')) {
      throw new Error('The selected destination cannot contain this element.')
    }

    const nameError = TreeTransferCatalog.isTransferableKind(sourceNode.element.kind)
      ? TreeTransferCatalog.validateName(
          rootNode,
          destinationNode,
          sourceNode.element.kind,
          copiedName ?? '',
        )
      : 'This element cannot be copied.'
    if (nameError != null) throw new Error(nameError)

    const nextRoot = TreeNode.clone(rootNode)
    const nextDestination = TreeNode.findNode(nextRoot, destinationNodeId)
    if (nextDestination == null) throw new Error(`node-${destinationNodeId} was not found.`)
    const copied = TreeTransferIdentity.copy(
      rootNode,
      sourceNode,
      copiedName,
      findMaxNodeId(rootNode) + 1,
    )
    const insertIndex = TreeTransferCatalog.getInsertIndex(nextDestination)
    if (insertIndex == null) nextDestination.children.push(copied.node)
    else nextDestination.children.splice(insertIndex, 0, copied.node)
    nextDestination.isOpen = true

    return {
      rootNode: nextRoot,
      copiedNodeId: copied.node.id,
      nodeIds: copied.nodeIds,
    }
  }
}

export default TreeTransferPlanner
