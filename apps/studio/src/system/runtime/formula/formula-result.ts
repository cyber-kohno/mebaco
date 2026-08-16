import type ScriptError from '../script/script-error'

namespace FormulaResult {
  export type Success = {
    ok: true
    value: unknown
  }

  export type Failure = {
    ok: false
    message: string
    error: ScriptError.Value
  }

  export type Value = Success | Failure

  export const success = (
    value: unknown,
  ): Success => ({
    ok: true,
    value,
  })

  export const failure = (
    error: ScriptError.Value,
  ): Failure => ({
    ok: false,
    message: error.message,
    error,
  })
}

export default FormulaResult
