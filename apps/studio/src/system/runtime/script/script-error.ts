namespace ScriptError {
  export type Stage = 'compile' | 'runtime'

  export type Value = {
    stage: Stage
    message: string
    line?: number
    column?: number
  }

  type CreateOptions = {
    line?: number
    column?: number
  }

  export const create = (
    stage: Stage,
    message: string,
    options: CreateOptions = {},
  ): Value => ({
    stage,
    message,
    line: options.line,
    column: options.column,
  })

  export const fromUnknown = (
    stage: Stage,
    error: unknown,
  ): Value => create(
    stage,
    error instanceof Error ? error.message : String(error),
  )

  export const format = (
    error: Value,
  ): string => {
    const position = error.line == null
      ? ''
      : ` (${error.line}:${error.column ?? 1})`

    return `${error.stage === 'compile' ? 'TypeScript' : 'Runtime'}${position}: ${error.message}`
  }
}

export default ScriptError
