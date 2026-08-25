namespace MonacoInjection {
  export type Mode = 'expression' | 'action'
  export type ExpectedType = 'string' | 'number' | 'boolean' | 'array'

  export type AnalysisOptions = {
    injectionSource?: string
    scopeId?: string
    expectedType?: ExpectedType
    expectedTypeText?: string
    allowAwait?: boolean
  }

  export const createDefaultInjectionSource = (
    _mode: Mode,
  ): string => ''

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
