import * as Monaco from 'monaco-editor'
import ExpressionTypeInference from '@system/model/code-analysis/expression-type-inference'
import ScriptPolicy from '../../runtime/script/script-policy'
import { MonacoDiagnostics } from '@system/infra/monaco/diagnostics'
import { MonacoFactory } from '@system/infra/monaco/factory'
import { MonacoInjection } from '@system/model/code-analysis/injection'

namespace FormulaDiagnostic {
  export type Options = {
    source: string
    injectionSource?: string
    expectedType?: MonacoInjection.ExpectedType
    expectedTypeText?: string
    allowAwait?: boolean
  }

  export type Result = {
    messages: readonly string[]
  }

  type TypeScriptService = {
    getSyntacticDiagnostics: (uri: string) => Promise<unknown[]>
    getSemanticDiagnostics: (uri: string) => Promise<unknown[]>
  }

  export const verify = async (
    options: Options,
  ): Promise<Result> => {
    if (options.source.trim().length === 0) {
      return { messages: ['No formula entered.'] }
    }

    const monaco = await MonacoFactory.createMonaco()
    const scopeId = crypto.randomUUID()
    const uri = Monaco.Uri.parse(`inmemory://mebaco/formula-label/${scopeId}.ts`)
    const analysisOptions: MonacoInjection.AnalysisOptions = {
      injectionSource: options.injectionSource,
      scopeId,
      expectedType: options.expectedType,
      expectedTypeText: options.expectedTypeText,
      allowAwait: options.allowAwait,
    }
    const analysisSource = MonacoInjection.wrapForAnalysis(
      options.source,
      'expression',
      analysisOptions,
    )
    const model = MonacoFactory.createModel(monaco, analysisSource, uri)
    const messages: string[] = []

    try {
      const service = await MonacoFactory.getTypeScriptService(
        monaco,
        uri,
      ) as TypeScriptService
      const diagnostics = [
        ...await service.getSyntacticDiagnostics(uri.toString()),
        ...await service.getSemanticDiagnostics(uri.toString()),
      ]
      MonacoDiagnostics.createMarkers(
        monaco,
        diagnostics as Parameters<typeof MonacoDiagnostics.createMarkers>[1],
        model,
        'expression',
        MonacoInjection.getAnalysisOffsetLine('expression', analysisOptions),
        Math.max(1, options.source.split('\n').length),
      )
        .filter((marker) => marker.severity === monaco.MarkerSeverity.Error)
        .forEach((marker) => messages.push(marker.message))

      if (options.expectedType === 'array') {
        const inferred = ExpressionTypeInference.inferArrayItem(
          options.injectionSource ?? '',
          options.source,
        )
        if (!inferred.ok) messages.push(inferred.error)
      }

      const expectedTypeText = options.expectedTypeText ?? (
        options.expectedType === 'array' ? 'unknown[]' : options.expectedType
      )
      if (expectedTypeText != null) {
        const typeError = ExpressionTypeInference.validateExpectedType(
          options.injectionSource ?? '',
          options.source,
          expectedTypeText,
          options.allowAwait === true,
        )
        if (typeError != null) messages.push(typeError)
      }

      ScriptPolicy.validate(options.source, {
        allowAwait: options.allowAwait === true,
        forbidReturn: false,
      }).forEach((message) => messages.push(message))
    } finally {
      model.dispose()
    }

    return { messages: [...new Set(messages)] }
  }
}

export default FormulaDiagnostic
