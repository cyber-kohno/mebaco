import type FormulaContext from '../formula/formula-context'
import FormulaResult from '../formula/formula-result'
import ScriptCompiler from '../script/script-compiler'
import ScriptError from '../script/script-error'

namespace ActionEvaluator {
  export const executeScript = (
    code: string,
    context: FormulaContext.Value,
  ): FormulaResult.Value => {
    const compiled = ScriptCompiler.compile('action', code)
    if (!compiled.ok) return FormulaResult.failure(compiled.error)

    try {
      return FormulaResult.success(compiled.script(context))
    } catch (error) {
      return FormulaResult.failure(ScriptError.fromUnknown('runtime', error))
    }
  }
}

export default ActionEvaluator
