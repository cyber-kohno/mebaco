import type FormulaContext from '../formula/formula-context'
import type ScriptError from '../script/script-error'
import type TreeNode from '../../tree/tree-node'
import FormulaContextValue from '../formula/formula-context'
import FormulaEvaluator from '../formula/formula-evaluator'
import ScriptErrorValue from '../script/script-error'
import VariableFrame from '../variable/variable-frame'

namespace LoopResolver {
  export const maximumIterations = 10_000

  export type Iteration = {
    index: number
    context: FormulaContext.Value
  }

  export type Result = {
    iterations: Iteration[]
    error: ScriptError.Value | null
  }

  const invalid = (message: string): Result => ({
    iterations: [],
    error: ScriptErrorValue.create('runtime', message),
  })

  const createContext = (
    context: FormulaContext.Value,
    values: Record<string, unknown>,
  ): FormulaContext.Value => {
    const frame = VariableFrame.create(context.$var)
    Object.entries(values).forEach(([id, value]) => frame.declare(id, 'const', value))
    return FormulaContextValue.create({ ...context, $var: frame.values })
  }

  export const resolve = (
    loopNode: TreeNode.Node,
    context: FormulaContext.Value,
  ): Result => {
    if (loopNode.element.kind !== 'loop') return invalid('Loop element is invalid.')
    const loop = loopNode.element

    if (loop.mode === 'count') {
      const evaluated = FormulaEvaluator.evaluateExpression(
        loop.countSource,
        context,
      )
      if (!evaluated.ok) return { iterations: [], error: evaluated.error }
      if (
        typeof evaluated.value !== 'number'
        || !Number.isFinite(evaluated.value)
        || !Number.isInteger(evaluated.value)
        || evaluated.value < 0
      ) return invalid('Loop count must be a non-negative finite integer.')
      if (evaluated.value > maximumIterations) {
        return invalid(`Loop count must be ${maximumIterations.toLocaleString()} or fewer.`)
      }

      return {
        iterations: Array.from({ length: evaluated.value }, (_, index) => ({
          index,
          context: createContext(context, { [loop.indexId]: index }),
        })),
        error: null,
      }
    }

    const evaluated = FormulaEvaluator.evaluateExpression(
      loop.collectionSource,
      context,
    )
    if (!evaluated.ok) return { iterations: [], error: evaluated.error }
    if (!Array.isArray(evaluated.value)) return invalid('Loop collection must return an array.')
    if (evaluated.value.length > maximumIterations) {
      return invalid(`Loop collection must contain ${maximumIterations.toLocaleString()} items or fewer.`)
    }

    return {
      iterations: evaluated.value.map((item, index) => ({
        index,
        context: createContext(context, {
          [loop.itemId]: item,
          [loop.indexId]: index,
        }),
      })),
      error: null,
    }
  }
}

export default LoopResolver
