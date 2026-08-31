import TypeScript from 'typescript'
import ScriptCache from './script-cache'
import ScriptError from './script-error'

namespace ScriptCompiler {
  export type Context = Record<string, unknown>
  export type Script = (context: Context) => unknown

  export type Compiled = {
    ok: true
    script: Script
  }

  export type Failed = {
    ok: false
    error: ScriptError.Value
  }

  export type Result = Compiled | Failed

  type WrappedSource = {
    value: string
    sourceStartLine: number
    sourceLineCount: number
  }

  export type CompileOptions = {
    parameterNames?: readonly string[]
  }

  const commonContextNames = [
    '$args',
    '$launch',
    '$state',
    '$param',
    '$local',
    '$props',
    '$var',
    '$fn',
    '$system',
    '$event',
  ]

  const createWrappedSource = (
    mode: ScriptCache.Mode,
    source: string,
    options: CompileOptions = {},
  ): WrappedSource => {
    const expression = mode === 'expression' || mode === 'async-expression'
    const code = mode === 'code' || mode === 'async-code'
    const asyncPrefix = mode === 'async-expression' || mode === 'async-action' || mode === 'async-code'
      ? 'async '
      : ''
    if (code) {
      const contextNames = commonContextNames.filter((name) => name !== '$args')
      const parameterNames = options.parameterNames ?? []
      const bodyParameters = [...contextNames, ...parameterNames]
        .map((name) => `${name}: unknown`)
        .join(', ')
      const bodyArguments = [
        ...contextNames.map((name) => `context.${name}`),
        ...parameterNames.map((name) => `context.$args.${name}`),
      ].join(', ')
      const lines = [
        `const __mebacoFunctionBody = ${asyncPrefix}(${bodyParameters}) => {`,
        source,
        '};',
        `const __mebacoScript = ${asyncPrefix}(context: Record<string, any>) => __mebacoFunctionBody(${bodyArguments});`,
      ]
      return {
        value: lines.join('\n'),
        sourceStartLine: 2,
        sourceLineCount: source.split('\n').length,
      }
    }
    const contextNames = [
      ...commonContextNames,
      ...(expression ? [] : ['$transition']),
    ].join(', ')
    const lines = expression
      ? [
          `const __mebacoScript = ${asyncPrefix}(context: Record<string, unknown>) => {`,
          `  const { ${contextNames} } = context;`,
          '  return (',
          source,
          '  );',
          '};',
        ]
      : [
          `const __mebacoScript = ${asyncPrefix}(context: Record<string, unknown>) => {`,
          `  const { ${contextNames} } = context;`,
          source,
          '};',
        ]

    return {
      value: lines.join('\n'),
      sourceStartLine: expression ? 4 : 3,
      sourceLineCount: source.split('\n').length,
    }
  }

  const createCompileError = (
    diagnostic: TypeScript.Diagnostic,
    wrapped: WrappedSource,
  ): ScriptError.Value => {
    const message = TypeScript.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n',
    )

    if (diagnostic.file == null || diagnostic.start == null) {
      return ScriptError.create('compile', message)
    }

    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
    const wrappedLine = position.line + 1
    const sourceLine = wrappedLine - wrapped.sourceStartLine + 1
    const isInSource = sourceLine >= 1 && sourceLine <= wrapped.sourceLineCount

    return ScriptError.create('compile', message, isInSource
      ? {
          line: sourceLine,
          column: position.character + 1,
        }
      : {})
  }

  export const compile = (
    mode: ScriptCache.Mode,
    source: string,
    options: CompileOptions = {},
  ): Result => {
    const cacheSource = `${(options.parameterNames ?? []).join('\u0001')}\u0002${source}`
    const cached = ScriptCache.get<Result>(mode, cacheSource)
    if (cached != null) return cached

    const wrapped = createWrappedSource(mode, source, options)
    const output = TypeScript.transpileModule(wrapped.value, {
      compilerOptions: {
        target: TypeScript.ScriptTarget.ES2022,
        module: TypeScript.ModuleKind.ESNext,
        strict: true,
      },
      fileName: `mebaco-${mode}.ts`,
      reportDiagnostics: true,
    })
    const diagnostic = output.diagnostics?.find((item) => (
      item.category === TypeScript.DiagnosticCategory.Error
    ))

    if (diagnostic != null) {
      return ScriptCache.set<Result>(mode, cacheSource, {
        ok: false,
        error: createCompileError(diagnostic, wrapped),
      })
    }

    try {
      const factory = new Function(
        `${output.outputText}\nreturn __mebacoScript;\n//# sourceURL=mebaco-${mode}.js`,
      ) as () => Script

      return ScriptCache.set<Result>(mode, cacheSource, {
        ok: true,
        script: factory(),
      })
    } catch (error) {
      return ScriptCache.set<Result>(mode, cacheSource, {
        ok: false,
        error: ScriptError.fromUnknown('compile', error),
      })
    }
  }
}

export default ScriptCompiler
