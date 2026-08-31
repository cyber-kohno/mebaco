import * as Monaco from 'monaco-editor'
import type TreeNode from '../../tree/tree-node'
import ExpressionTypeInference from '../../element/kind/type/expression-type-inference'
import MonacoDiagnostics from '../../ui/monaco/monaco-diagnostics'
import MonacoFactory from '../../ui/monaco/monaco-factory'
import MebacoInjection from '../../ui/monaco/monaco-injection'
import MebacoInjectionSource from '../../ui/monaco/mebaco-injection-source'
import ScriptPolicy from '../../runtime/script/script-policy'
import ExpressionSourceCatalog from './expression-source-catalog'

namespace ExpressionVerifier {
  export type Status = 'unverified' | 'verified' | 'error'

  export type Result = {
    status: Exclude<Status, 'unverified'>
    messages: readonly string[]
  }

  type TypeScriptService = {
    getSyntacticDiagnostics: (uri: string) => Promise<unknown[]>
    getSemanticDiagnostics: (uri: string) => Promise<unknown[]>
  }

  const createUri = (nodeId: number, index: number): Monaco.Uri => (
    Monaco.Uri.parse(`inmemory://mebaco/verify/${nodeId}/${crypto.randomUUID()}-${index}.ts`)
  )

  export const verify = async (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): Promise<Result | null> => {
    const catalog = ExpressionSourceCatalog.collect(rootNode, node)
    if (!catalog.hasExpressionField) return null
    if (catalog.sources.length === 0) return { status: 'verified', messages: [] }

    const monaco = await MonacoFactory.createMonaco()
    const messages: string[] = []

    for (const [index, source] of catalog.sources.entries()) {
      const uri = createUri(node.id, index)
      const injectionSource = MebacoInjectionSource.createForNode(
        rootNode,
        node.id,
        source.mode,
        false,
      )
      const options: MebacoInjection.AnalysisOptions = {
        injectionSource,
        scopeId: `verify_${node.id}_${index}`,
        expectedTypeText: source.expectedTypeText,
        allowAwait: source.allowAwait,
        functionParameters: source.functionParameters,
      }
      const analysisSource = MebacoInjection.wrapForAnalysis(
        source.source,
        source.mode,
        options,
      )
      const model = MonacoFactory.createModel(monaco, analysisSource, uri)

      try {
        const service = await MonacoFactory.getTypeScriptService(
          monaco,
          uri,
        ) as TypeScriptService
        const diagnostics = [
          ...await service.getSyntacticDiagnostics(uri.toString()),
          ...await service.getSemanticDiagnostics(uri.toString()),
        ]
        const markers = MonacoDiagnostics.createMarkers(
          monaco,
          diagnostics as Parameters<typeof MonacoDiagnostics.createMarkers>[1],
          model,
          source.mode,
          MebacoInjection.getAnalysisOffsetLine(source.mode, options),
          Math.max(1, source.source.split('\n').length),
        )

        if (source.mode === 'expression' && source.expectedTypeText === 'unknown[]') {
          const inferred = ExpressionTypeInference.inferArrayItem(
            injectionSource,
            source.source,
          )
          if (!inferred.ok) {
            messages.push(inferred.error)
          }
        }

        if (source.mode === 'expression' && source.expectedTypeText != null) {
          const typeError = ExpressionTypeInference.validateExpectedType(
            injectionSource,
            source.source,
            source.expectedTypeText,
          )
          if (typeError != null) messages.push(typeError)
        }

        ScriptPolicy.validate(source.source, {
          allowAwait: source.allowAwait === true,
          forbidReturn: source.mode === 'action',
        }).forEach((message) => messages.push(message))

        markers
          .filter((marker) => marker.severity === monaco.MarkerSeverity.Error)
          .forEach((marker) => messages.push(marker.message))
      } finally {
        model.dispose()
      }
    }

    return messages.length === 0
      ? { status: 'verified', messages: [] }
      : { status: 'error', messages: [...new Set(messages)] }
  }
}

export default ExpressionVerifier
