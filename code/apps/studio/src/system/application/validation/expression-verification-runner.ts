import type TreeNode from '@system/model/tree/tree-node'
import type { ExpressionVerification } from '@system/model/validation/expression/result'
import { ExpressionVerifier } from '@system/infra/monaco/expression-verification'

namespace ExpressionVerificationRunner {
  export const verify = async (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): Promise<ExpressionVerification.Result | null> => {
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
