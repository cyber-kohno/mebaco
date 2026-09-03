import TreeNode from '../tree-node'
import TreeTransferCatalog from './tree-transfer-catalog'
import TreeTransferIdentity from './tree-transfer-identity'

namespace TreeTransferPlanner {
  export type CopyPlan = {
    rootNode: TreeNode.Node
    copiedNodeId: number
    nodeIds: ReadonlyMap<number, number>
  }

  export type MovePlan = {
    rootNode: TreeNode.Node
    movedNodeId: number
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

  export const move = (
    rootNode: TreeNode.Node,
    sourceNodeId: number,
    destinationNodeId: number,
  ): MovePlan => {
    const sourceNode = TreeNode.findNode(rootNode, sourceNodeId)
    const destinationNode = TreeNode.findNode(rootNode, destinationNodeId)
    if (sourceNode == null) throw new Error(`node-${sourceNodeId} was not found.`)
    if (destinationNode == null) throw new Error(`node-${destinationNodeId} was not found.`)
    const sourceElement = sourceNode.element
    if (!TreeTransferCatalog.isMovableKind(sourceElement.kind)) {
      throw new Error('This element cannot be moved.')
    }
    if (!TreeTransferCatalog.canPasteTo(rootNode, sourceNode, destinationNode, 'move')) {
      throw new Error('The selected destination cannot contain this element.')
    }

    const nextRoot = TreeNode.clone(rootNode)
    const nextSource = TreeNode.findNode(nextRoot, sourceNodeId)
    const nextParent = TreeNode.findParent(nextRoot, sourceNodeId)
    if (nextSource == null || nextParent == null) {
      throw new Error(`node-${sourceNodeId} cannot be moved.`)
    }
    const sourceIndex = nextParent.children.findIndex((child) => child.id === sourceNodeId)
    if (sourceIndex < 0) throw new Error(`node-${sourceNodeId} cannot be moved.`)
    nextParent.children.splice(sourceIndex, 1)

    const nextDestination = TreeNode.findNode(nextRoot, destinationNodeId)
    if (nextDestination == null) throw new Error(`node-${destinationNodeId} was not found.`)
    const nameError = TreeTransferCatalog.validateName(
      nextRoot,
      nextDestination,
      sourceElement.kind,
      TreeTransferCatalog.getLabel(sourceElement),
    )
    if (nameError != null) throw new Error(nameError)

    const insertIndex = TreeTransferCatalog.getInsertIndex(nextDestination)
    if (insertIndex == null) nextDestination.children.push(nextSource)
    else nextDestination.children.splice(insertIndex, 0, nextSource)
    nextDestination.isOpen = true

    return {
      rootNode: nextRoot,
      movedNodeId: sourceNodeId,
    }
  }
}

export default TreeTransferPlanner
