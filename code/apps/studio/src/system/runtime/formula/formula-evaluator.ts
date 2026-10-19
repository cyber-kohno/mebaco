import type FormulaContext from './formula-context'
import FormulaResult from './formula-result'
import ScriptCompiler from '../script/script-compiler'
import ScriptError from '../script/script-error'

namespace FormulaEvaluator {
  export const evaluateExpression = (
    code: string,
    context: FormulaContext.Value,
  ): FormulaResult.Value => {
    const compiled = ScriptCompiler.compile('expression', code)
    if (!compiled.ok) return FormulaResult.failure(compiled.error)

    try {
      return FormulaResult.success(compiled.script(context))
    } catch (error) {
      return FormulaResult.failure(ScriptError.fromUnknown('runtime', error))
    }
  }

  export const evaluateExpressionAsync = async (
    code: string,
    context: FormulaContext.Value,
  ): Promise<FormulaResult.Value> => {
    const compiled = ScriptCompiler.compile('async-expression', code)
    if (!compiled.ok) return FormulaResult.failure(compiled.error)

    try {
      return FormulaResult.success(await compiled.script(context))
    } catch (error) {
      return FormulaResult.failure(ScriptError.fromUnknown('runtime', error))
    }
  }
}

export default FormulaEvaluator
