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

  const contextNames = [
    '$args',
    '$launch',
    '$state',
    '$param',
    '$props',
    '$var',
    '$function',
    '$system',
    '$event',
  ].join(', ')

  const createWrappedSource = (
    mode: ScriptCache.Mode,
    source: string,
  ): WrappedSource => {
    const expression = mode === 'expression' || mode === 'async-expression'
    const asyncPrefix = mode === 'async-expression' || mode === 'async-action'
      ? 'async '
      : ''
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
  ): Result => {
    const cached = ScriptCache.get<Result>(mode, source)
    if (cached != null) return cached

    const wrapped = createWrappedSource(mode, source)
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
      return ScriptCache.set<Result>(mode, source, {
        ok: false,
        error: createCompileError(diagnostic, wrapped),
      })
    }

    try {
      const factory = new Function(
        `${output.outputText}\nreturn __mebacoScript;\n//# sourceURL=mebaco-${mode}.js`,
      ) as () => Script

      return ScriptCache.set<Result>(mode, source, {
        ok: true,
        script: factory(),
      })
    } catch (error) {
      return ScriptCache.set<Result>(mode, source, {
        ok: false,
        error: ScriptError.fromUnknown('compile', error),
      })
    }
  }
}

export default ScriptCompiler
