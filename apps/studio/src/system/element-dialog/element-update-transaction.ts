import ExpressionReferenceRenamer from '../analysis/expression-reference-renamer'
import type MebacoElement from '../element/element'
import TreeStore from '../store/tree-store'
import type TreeNode from '../tree/tree-node'
import ExpressionVerificationStore from '../validation/expression-verification-store'
import TypeImpact from '../validation/type-impact'

namespace ElementUpdateTransaction {
  export type Result = {
    idChanged: boolean
    updatedReferenceNodeIds: readonly number[]
    updatedOccurrenceCount: number
    verificationReset: boolean
  }

  type IdElement = MebacoElement.Element & { id: string }

  const hasId = (element: MebacoElement.Element): element is IdElement => (
    typeof (element as { id?: unknown }).id === 'string'
  )

  export const commit = (
    rootNode: TreeNode.Node,
    nodeId: number,
    previousElement: MebacoElement.Element,
    nextElement: MebacoElement.Element,
  ): Result => {
    const idChanged = hasId(previousElement)
      && hasId(nextElement)
      && previousElement.id !== nextElement.id
    const renameResult = idChanged
      ? ExpressionReferenceRenamer.rename(rootNode, nodeId, nextElement.id)
      : {
          rootNode,
          changedNodeIds: [] as readonly number[],
          occurrenceCount: 0,
        }
    const nextRoot = TreeStore.createUpdatedRoot(
      renameResult.rootNode,
      nodeId,
      nextElement,
    )
    const verificationReset = TypeImpact.hasChanged(previousElement, nextElement)

    TreeStore.commitRootChange(nextRoot)
    if (verificationReset) ExpressionVerificationStore.clear()

    return {
      idChanged,
      updatedReferenceNodeIds: renameResult.changedNodeIds,
      updatedOccurrenceCount: renameResult.occurrenceCount,
      verificationReset,
    }
  }
}

export default ElementUpdateTransaction
