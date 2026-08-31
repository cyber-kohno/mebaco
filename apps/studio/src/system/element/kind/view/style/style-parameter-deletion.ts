import ElementDeletionController from '../../../deletion/element-deletion-controller'
import TreeStore from '../../../../store/tree-store'
import TreeNode from '../../../../tree/tree-node'
import StyleParameterBindingSync from './style-parameter-binding-sync'

namespace StyleParameterDeletion {
  export const request = (
    rootNode: TreeNode.Node,
    deletionNode: TreeNode.Node,
    parameterNodes: readonly TreeNode.Node[],
    label: string,
  ): void => {
    const referenceRoot = TreeNode.clone(rootNode)
    StyleParameterBindingSync.prepareRemovalReferenceAnalysis(
      referenceRoot,
      parameterNodes
        .flatMap((node) => node.element.kind === 'style-param'
          ? [node.element.parameterId]
          : []),
    )

    void ElementDeletionController.requestDelete({
      rootNode: referenceRoot,
      node: TreeNode.findNode(referenceRoot, deletionNode.id) ?? deletionNode,
      referenceNodes: parameterNodes.map((node) => (
        TreeNode.findNode(referenceRoot, node.id) ?? node
      )),
      policy: {
        label,
        structuralReferences: 'ignore',
        expressionReferences: 'confirm',
      },
      deleteNode: () => TreeStore.removeNode(deletionNode.id),
    })
  }
}

export default StyleParameterDeletion
