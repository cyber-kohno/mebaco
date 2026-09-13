import ConstantScope from '../element/kind/declare/constant-scope'
import FormulaContext from './formula/formula-context'
import FormulaEvaluator from './formula/formula-evaluator'
import type ScriptError from './script/script-error'
import type TreeNode from '../tree/tree-node'

namespace RuntimeConstant {
  export type Error = {
    nodeId: number
    error: ScriptError.Value
  }

  export type Result = {
    values: Readonly<Record<string, unknown>>
    errors: readonly Error[]
  }

  const createReadonlyNamespace = (
    target: Record<string, unknown>,
  ): Readonly<Record<string, unknown>> => new Proxy(target, {
    set: (_current, property) => {
      throw new Error(`Constant '${String(property)}' is readonly.`)
    },
    deleteProperty: (_current, property) => {
      throw new Error(`Constant '${String(property)}' cannot be deleted.`)
    },
    defineProperty: (_current, property) => {
      throw new Error(`Constant '${String(property)}' is readonly.`)
    },
  })

  export const create = (
    projectNode: TreeNode.Node,
    appNodeId: number,
  ): Result => {
    const target: Record<string, unknown> = Object.create(null)
    const values = createReadonlyNamespace(target)
    const errors: Error[] = []

    ConstantScope.collectVisible(projectNode, appNodeId).forEach((entry) => {
      const result = FormulaEvaluator.evaluateExpression(
        entry.element.source,
        FormulaContext.create({ $const: values }),
      )
      if (result.ok) {
        target[entry.element.id] = result.value
      } else {
        errors.push({ nodeId: entry.node.id, error: result.error })
      }
    })

    return { values, errors }
  }
}

export default RuntimeConstant
