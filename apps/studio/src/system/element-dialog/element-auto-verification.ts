import { get } from 'svelte/store'
import TreeStore from '../store/tree-store'
import TreeNode from '../tree/tree-node'
import ExpressionVerificationRunner from '../validation/expression/expression-verification-runner'
import ExpressionVerificationStore from '../validation/expression/expression-verification-store'

namespace ElementAutoVerification {
  export const verify = async (
    nodeId: number,
  ): Promise<void> => {
    const rootNode = get(TreeStore.rootNode)
    const node = TreeNode.findNode(rootNode, nodeId)
    if (node == null) return

    const result = await ExpressionVerificationRunner.verify(rootNode, node)
    if (result == null) return

    // Verification is asynchronous. Never attach a result to a tree that was
    // replaced while Monaco was analyzing the original snapshot.
    if (get(TreeStore.rootNode) !== rootNode) return
    ExpressionVerificationStore.setResult(node, result)
  }
}

export default ElementAutoVerification
