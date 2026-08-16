namespace MonacoInjection {
  export type Mode = 'expression' | 'action'
  export type ExpectedType = 'string' | 'number' | 'boolean' | 'array'

  export type AnalysisOptions = {
    injectionSource?: string
    scopeId?: string
    expectedType?: ExpectedType
    expectedTypeText?: string
  }

  export const createDefaultInjectionSource = (
    mode: Mode,
  ): string => {
    const declarations = [
      'declare var $state: Record<string, unknown>;',
      'declare var $param: Record<string, unknown>;',
      'declare var $args: Record<string, unknown>;',
      'declare var $props: Record<string, unknown>;',
      'declare var $var: Record<string, unknown>;',
      'declare var $function: Record<string, unknown>;',
      'declare var $system: Record<string, unknown>;',
    ]

    if (mode === 'action') {
      declarations.push('declare var $event: Event;')
    }

    return declarations.join('\n')
  }

  export const wrapForAnalysis = (
    code: string,
    mode: Mode,
    options: AnalysisOptions = {},
  ): string => {
    const declarations = options.injectionSource == null
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
        `function __mebacoAction${scopeSuffix}() {`,
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
      `const __mebacoExpressionResult${scopeSuffix}${expectedTypeText == null ? '' : `: ${expectedTypeText}`} = (`,
      analysisCode,
      ');',
    ].join('\n')
  }

  export const getAnalysisOffsetLine = (
    options: AnalysisOptions = {},
  ): number => {
    const declarationLineCount = options.injectionSource == null
      ? 0
      : options.injectionSource.split('\n').length
    const moduleAndWrapperLineCount = 2

    return declarationLineCount + moduleAndWrapperLineCount
  }
}

export default MonacoInjection
