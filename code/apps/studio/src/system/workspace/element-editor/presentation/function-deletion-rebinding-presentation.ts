import { translate } from '@system/application/localization'
import type FunctionDeletionPolicy from '@system/model/function/function-deletion-policy'

namespace FunctionDeletionRebindingPresentation {
  export type Value = Readonly<{
    title: string
    message: string[]
  }>

  const formatReferenceLines = (
    functionId: string,
    rebindings: readonly FunctionDeletionPolicy.Rebinding[],
  ): string[] => {
    const labelsBySource = new Map<string, Set<string>>()
    rebindings.forEach(({ reference, replacementNodeId }) => {
      const key = `${reference.sourceNodeId}:${replacementNodeId}`
      const labels = labelsBySource.get(key) ?? new Set<string>()
      labels.add(reference.sourceLabel)
      labelsBySource.set(key, labels)
    })
    return [...labelsBySource]
      .map(([key, labels]) => {
        const [sourceNodeId, replacementNodeId] = key.split(':').map(Number)
        return `node-${sourceNodeId}: ${[...labels].join(', ')} -> node-${replacementNodeId}: function.${functionId}`
      })
      .sort((left, right) => left.localeCompare(right))
  }

  export const create = (
    functionId: string,
    rebindings: readonly FunctionDeletionPolicy.Rebinding[],
  ): Value => {
    const nodeCount = new Set(
      rebindings.map(({ reference }) => reference.sourceNodeId),
    ).size
    return {
      title: translate('workspace.elementDeletion.functionRebinding.title'),
      message: [
        translate(
          nodeCount === 1
            ? 'workspace.elementDeletion.functionRebinding.summary.one'
            : 'workspace.elementDeletion.functionRebinding.summary.many',
          { count: nodeCount },
        ),
        ...formatReferenceLines(functionId, rebindings),
        translate('workspace.elementDeletion.functionRebinding.note'),
      ],
    }
  }
}

export default FunctionDeletionRebindingPresentation
