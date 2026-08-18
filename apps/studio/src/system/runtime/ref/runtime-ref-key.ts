import type FormulaContext from '../formula/formula-context'
import type ScriptError from '../script/script-error'
import type TagElement from '../../element/kind/view/tag-element'
import FormulaEvaluator from '../formula/formula-evaluator'
import ScriptErrorValue from '../script/script-error'

namespace RuntimeRefKey {
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
            ? 'Ref key formula must return a string.'
            : 'Ref key must be a string.',
        ),
      }
    }
    if (value.length === 0) {
      return {
        key: null,
        error: ScriptErrorValue.create('runtime', 'Ref key must not be empty.'),
      }
    }
    return { key: value, error: null }
  }

  export const resolve = (
    refKey: TagElement.RefKey | undefined,
    context: FormulaContext.Value,
  ): Result => {
    if (refKey == null) return { key: null, error: null }
    if (refKey.type === 'literal') return fromValue(refKey.value, false)

    const evaluated = FormulaEvaluator.evaluateExpression(refKey.source, context)
    return evaluated.ok
      ? fromValue(evaluated.value, true)
      : { key: null, error: evaluated.error }
  }
}

export default RuntimeRefKey
