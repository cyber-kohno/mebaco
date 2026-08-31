import type TreeNode from '../../tree/tree-node'
import ExpressionVerifier from './expression-verifier'

namespace ExpressionVerificationRunner {
  export const verify = async (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): Promise<ExpressionVerifier.Result | null> => {
    try {
      return await ExpressionVerifier.verify(rootNode, node)
    } catch (error) {
      return {
        status: 'error',
        messages: [error instanceof Error ? error.message : String(error)],
      }
    }
  }
}

export default ExpressionVerificationRunner
