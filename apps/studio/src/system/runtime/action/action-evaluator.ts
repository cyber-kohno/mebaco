import type FormulaContext from '../formula/formula-context'
import FormulaResult from '../formula/formula-result'
import ScriptCompiler from '../script/script-compiler'
import ScriptError from '../script/script-error'
import ScriptPolicy from '../script/script-policy'

namespace ActionEvaluator {
  export const executeScript = (
    code: string,
    context: FormulaContext.Value,
    policy: ScriptPolicy.Options = {},
  ): FormulaResult.Value => {
    const policyError = ScriptPolicy.validate(code, policy)[0]
    if (policyError != null) {
      return FormulaResult.failure(ScriptError.create('compile', policyError))
    }
    const compiled = ScriptCompiler.compile('action', code)
    if (!compiled.ok) return FormulaResult.failure(compiled.error)

    try {
      return FormulaResult.success(compiled.script(context))
    } catch (error) {
      return FormulaResult.failure(ScriptError.fromUnknown('runtime', error))
    }
  }

  export const executeScriptAsync = async (
    code: string,
    context: FormulaContext.Value,
  ): Promise<FormulaResult.Value> => {
    const policyError = ScriptPolicy.validate(code, {
      allowAwait: true,
      forbidReturn: true,
    })[0]
    if (policyError != null) {
      return FormulaResult.failure(ScriptError.create('compile', policyError))
    }

    const compiled = ScriptCompiler.compile('async-action', code)
    if (!compiled.ok) return FormulaResult.failure(compiled.error)

    try {
      return FormulaResult.success(await compiled.script(context))
    } catch (error) {
      return FormulaResult.failure(ScriptError.fromUnknown('runtime', error))
    }
  }
}

export default ActionEvaluator
