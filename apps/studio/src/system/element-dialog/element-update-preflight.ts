import LoopReferenceRefactor from '../analysis/reference/loop-reference-refactor'
import type MebacoElement from '../element/element'
import ConfirmDialogController from '../feedback/confirm/confirm-dialog-controller'
import type TreeNode from '../tree/tree-node'
import UnionDefinitionUpdatePolicy from '../element/kind/type/union/union-definition-update-policy'
import ReferenceImpact from '../analysis/reference/reference-impact'

namespace ElementUpdatePreflight {
  const findNode = (node: TreeNode.Node, nodeId: number): TreeNode.Node | null => {
    if (node.id === nodeId) return node
    for (const child of node.children) {
      const found = findNode(child, nodeId)
      if (found != null) return found
    }
    return null
  }

  export const confirm = async (
    rootNode: TreeNode.Node,
    nodeId: number,
    previousElement: MebacoElement.Element,
    nextElement: MebacoElement.Element,
  ): Promise<boolean> => {
    if (
      previousElement.kind === 'launcher'
      && nextElement.kind === 'launcher'
      && previousElement.appId !== nextElement.appId
    ) {
      const references = ReferenceImpact.collectReferences(rootNode, [nodeId], 'structural')
        .filter((reference) => (
          findNode(rootNode, reference.sourceNodeId)?.element.kind
            === 'debug-launch-shortcuts'
        ))
      if (references.length > 0) {
        await ConfirmDialogController.openNotice({
          title: 'Update Blocked',
          message: [
            `Launcher '${previousElement.id}' is configured as an App launch shortcut.`,
            'Clear the shortcut under Debug > Launch Shortcuts before changing its target App.',
          ],
        })
        return false
      }
    }

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
