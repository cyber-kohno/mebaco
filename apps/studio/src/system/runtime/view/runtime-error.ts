import ScriptError from '../script/script-error'

export namespace RuntimeError {
  export type Category = 'assert' | 'unexpected'

  export type Failure = {
    category: Category
    message: string
    nodeId?: number
    elementKind?: string
    scriptError?: ScriptError.Value
  }

  export const unexpected = (
    message: string,
    options: Omit<Failure, 'category' | 'message'> = {},
  ): Failure => ({ category: 'unexpected', message, ...options })

  export const assertion = (
    message: string,
    options: Omit<Failure, 'category' | 'message'> = {},
  ): Failure => ({ category: 'assert', message, ...options })

  export const fromScriptError = (
    error: ScriptError.Value,
    options: Omit<Failure, 'category' | 'message' | 'scriptError'> = {},
  ): Failure => unexpected(ScriptError.format(error), { ...options, scriptError: error })
}

export default RuntimeError
