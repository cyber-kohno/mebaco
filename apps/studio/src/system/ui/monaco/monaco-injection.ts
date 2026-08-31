namespace MonacoInjection {
  export type Mode = 'expression' | 'action' | 'code'
  export type ExpectedType = 'string' | 'number' | 'boolean' | 'array'

  export type FunctionParameter = {
    name: string
    typeText: string
  }

  export type AnalysisOptions = {
    injectionSource?: string
    scopeId?: string
    expectedType?: ExpectedType
    expectedTypeText?: string
    allowAwait?: boolean
    functionParameters?: readonly FunctionParameter[]
  }

  export const createDefaultInjectionSource = (
    _mode: Mode,
  ): string => ''

  export const appendFunctionParameterDeclarations = (
    source: string,
    parameters: readonly FunctionParameter[],
  ): string => [
    source,
    ...parameters.map((parameter) => `declare let ${parameter.name}: ${parameter.typeText};`),
  ].filter((part) => part.length > 0).join('\n')

  export const wrapForAnalysis = (
    code: string,
    mode: Mode,
    options: AnalysisOptions = {},
  ): string => {
    const declarations = options.injectionSource == null || options.injectionSource.length === 0
      ? []
      : options.injectionSource.split('\n')
    const analysisCode = code.trim().length === 0 ? 'undefined' : code
    const scopeSuffix = options.scopeId == null
      ? ''
      : `_${options.scopeId.replace(/[^a-zA-Z0-9_$]/g, '_')}`

    if (mode === 'action') {
      return [
        'export {};',
        ...declarations,
        `${options.allowAwait === true ? 'async ' : ''}function __mebacoAction${scopeSuffix}() {`,
        analysisCode,
        '}',
      ].join('\n')
    }

    if (mode === 'code') {
      const parameters = (options.functionParameters ?? [])
        .map((parameter) => `${parameter.name}: ${parameter.typeText}`)
        .join(', ')
      const returnType = options.expectedTypeText == null
        ? ''
        : `: ${options.allowAwait === true
          ? `Promise<${options.expectedTypeText}>`
          : options.expectedTypeText}`
      return [
        'export {};',
        ...declarations,
        `${options.allowAwait === true ? 'async ' : ''}function __mebacoCode${scopeSuffix}(${parameters})${returnType} {`,
        analysisCode,
        '}',
      ].join('\n')
    }

    const expectedTypeText = options.expectedTypeText ?? (
      options.expectedType === 'array' ? 'unknown[]' : options.expectedType
    )

    return [
      'export {};',
      ...declarations,
      `${options.allowAwait === true ? 'async ' : ''}function __mebacoExpression${scopeSuffix}() {`,
      `const __mebacoExpressionResult${scopeSuffix}${expectedTypeText == null ? '' : `: ${expectedTypeText}`} = (`,
      analysisCode,
      ');',
      '}',
    ].join('\n')
  }

  export const getAnalysisOffsetLine = (
    mode: Mode,
    options: AnalysisOptions = {},
  ): number => {
    const declarationLineCount = options.injectionSource == null || options.injectionSource.length === 0
      ? 0
      : options.injectionSource.split('\n').length
    const moduleAndWrapperLineCount = mode === 'expression' ? 3 : 2

    return declarationLineCount + moduleAndWrapperLineCount
  }
}

export default MonacoInjection
