import LoopReferenceRefactor from '../analysis/reference/loop-reference-refactor'
import type MebacoElement from '../element/element'
import ConfirmDialogController from '../feedback/confirm/confirm-dialog-controller'
import type TreeNode from '../tree/tree-node'
import UnionDefinitionUpdatePolicy from '../element/kind/type/union/union-definition-update-policy'

namespace ElementUpdatePreflight {
  export const confirm = async (
    rootNode: TreeNode.Node,
    nodeId: number,
    previousElement: MebacoElement.Element,
    nextElement: MebacoElement.Element,
  ): Promise<boolean> => {
    if (previousElement.kind === 'union-type' && nextElement.kind === 'union-type') {
      const conflicts = UnionDefinitionUpdatePolicy.collectConflicts(
        rootNode,
        nodeId,
        previousElement,
        nextElement,
      )
      if (conflicts.length > 0) {
        await ConfirmDialogController.openNotice({
          title: 'Update Blocked',
          message: UnionDefinitionUpdatePolicy.createMessageLines(nextElement.id, conflicts),
        })
        return false
      }
    }

    if (previousElement.kind !== 'loop' || nextElement.kind !== 'loop') return true

    const plan = LoopReferenceRefactor.plan(
      rootNode,
      nodeId,
      previousElement,
      nextElement,
    )
    if (plan.removedOccurrenceCount === 0) return true

    const nodeCount = plan.removedReferences.length
    return ConfirmDialogController.open({
      tone: 'danger',
      title: 'Update Loop?',
      message: [
        `The Item Variable '${previousElement.mode === 'collection' ? previousElement.itemId : ''}' is referenced by ${plan.removedOccurrenceCount} ${plan.removedOccurrenceCount === 1 ? 'expression' : 'expressions'} in ${nodeCount} ${nodeCount === 1 ? 'element' : 'elements'}.`,
        ...plan.removedReferences.map((reference) => (
          `node-${reference.sourceNodeId}: ${reference.sourceLabel}`
        )),
        'Changing to Count mode will leave invalid expressions. You can repair them and run Verify afterward.',
      ],
      choices: [
        { label: 'Cancel', role: 'cancel' },
        { label: 'Update Anyway', role: 'proceed' },
      ],
    })
  }
}

export default ElementUpdatePreflight
