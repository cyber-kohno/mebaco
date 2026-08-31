import type FormulaContext from '../formula/formula-context'
import FormulaResult from '../formula/formula-result'
import ScriptCompiler from '../script/script-compiler'
import ScriptError from '../script/script-error'

namespace FunctionCodeEvaluator {
  export const evaluate = (
    source: string,
    parameterNames: readonly string[],
    context: FormulaContext.Value,
  ): FormulaResult.Value => {
    const compiled = ScriptCompiler.compile('code', source, { parameterNames })
    if (!compiled.ok) return FormulaResult.failure(compiled.error)

    try {
      return FormulaResult.success(compiled.script(context))
    } catch (error) {
      return FormulaResult.failure(ScriptError.fromUnknown('runtime', error))
    }
  }

  export const evaluateAsync = async (
    source: string,
    parameterNames: readonly string[],
    context: FormulaContext.Value,
  ): Promise<FormulaResult.Value> => {
    const compiled = ScriptCompiler.compile('async-code', source, { parameterNames })
    if (!compiled.ok) return FormulaResult.failure(compiled.error)

    try {
      return FormulaResult.success(await compiled.script(context))
    } catch (error) {
      return FormulaResult.failure(ScriptError.fromUnknown('runtime', error))
    }
  }
}

export default FunctionCodeEvaluator
