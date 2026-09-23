import * as Monaco from 'monaco-editor'
import type TreeNode from '@system/model/tree/tree-node'
import ExpressionTypeInference from '@system/model/code-analysis/expression-type-inference'
import { MonacoDiagnostics } from '@system/infra/monaco/diagnostics'
import { MonacoFactory } from '@system/infra/monaco/factory'
import {
  MonacoInjection as MebacoInjection,
} from '@system/model/code-analysis/injection'
import { MebacoInjectionSource } from '@system/model/code-analysis/source'
import type { ExpressionVerification } from '@system/model/validation/expression/result'
import ScriptPolicy from '../../runtime/script/script-policy'
import { ProcedureStructureVerifier } from '@system/model/validation/procedure/structure'
import { ExpressionSourceCatalog } from '@system/model/validation/expression/source-catalog'

namespace ExpressionVerifier {
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
  ): Promise<ExpressionVerification.Result | null> => {
    const catalog = ExpressionSourceCatalog.collect(rootNode, node)
    if (!ExpressionSourceCatalog.isVerificationCandidate(rootNode, node)) return null
    const messages = [...ProcedureStructureVerifier.verify(node)]
    if (catalog.sources.length === 0) {
      return messages.length === 0
        ? { status: 'verified', messages: [] }
        : { status: 'error', messages: [...new Set(messages)] }
    }

    const monaco = await MonacoFactory.createMonaco()

    for (const [index, source] of catalog.sources.entries()) {
      const uri = createUri(node.id, index)
      const injectionSource = MebacoInjectionSource.createForNode(
        rootNode,
        node.id,
        source.mode,
        false,
        source.eventType,
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
            source.allowAwait === true,
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
