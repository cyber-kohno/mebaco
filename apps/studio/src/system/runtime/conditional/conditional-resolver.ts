import type FormulaContext from '../formula/formula-context'
import type ScriptError from '../script/script-error'
import type TreeNode from '../../tree/tree-node'
import FormulaEvaluator from '../formula/formula-evaluator'
import ScriptErrorValue from '../script/script-error'

namespace ConditionalResolver {
  export type Result = {
    branchNode: TreeNode.Node | null
    error: ScriptError.Value | null
  }

  export const resolve = (
    conditionalNode: TreeNode.Node,
    context: FormulaContext.Value,
  ): Result => {
    for (const branchNode of conditionalNode.children) {
      if (branchNode.element.kind === 'else') {
        return { branchNode, error: null }
      }
      if (
        branchNode.element.kind !== 'if'
        && branchNode.element.kind !== 'else-if'
      ) continue

      const result = FormulaEvaluator.evaluateExpression(
        branchNode.element.condition,
        context,
      )
      if (!result.ok) return { branchNode: null, error: result.error }
      if (typeof result.value !== 'boolean') {
        return {
          branchNode: null,
          error: ScriptErrorValue.create(
            'runtime',
            `${branchNode.element.kind === 'if' ? 'If' : 'Else If'} condition must return a boolean.`,
          ),
        }
      }
      if (result.value) return { branchNode, error: null }
    }

    return { branchNode: null, error: null }
  }
}

export default ConditionalResolver
