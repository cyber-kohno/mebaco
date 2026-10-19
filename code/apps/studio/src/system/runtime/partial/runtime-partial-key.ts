import type FormulaContext from '../formula/formula-context'
import type ScriptError from '../script/script-error'
import type ResolvableValue from '@system/model/value/resolvable-value'
import FormulaEvaluator from '../formula/formula-evaluator'
import ScriptErrorValue from '../script/script-error'

namespace RuntimePartialKey {
  export type Result = {
    key: string | null
    error: ScriptError.Value | null
  }

  const fromValue = (
    value: unknown,
    formula: boolean,
  ): Result => {
    if (typeof value !== 'string') {
      return {
        key: null,
        error: ScriptErrorValue.create(
          'runtime',
          formula
            ? 'Partial key formula must return a string.'
            : 'Partial key must be a string.',
        ),
      }
    }
    if (value.length === 0) {
      return {
        key: null,
        error: ScriptErrorValue.create('runtime', 'Partial key must not be empty.'),
      }
    }
    return { key: value, error: null }
  }

  export const resolve = (
    partialKey: ResolvableValue.Value<string> | undefined,
    context: FormulaContext.Value,
  ): Result => {
    if (partialKey == null) return { key: null, error: null }
    if (partialKey.type === 'literal') return fromValue(partialKey.value, false)

    const evaluated = FormulaEvaluator.evaluateExpression(partialKey.source, context)
    return evaluated.ok
      ? fromValue(evaluated.value, true)
      : { key: null, error: evaluated.error }
  }
}

export default RuntimePartialKey
