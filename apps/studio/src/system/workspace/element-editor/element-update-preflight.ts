import { LoopReferenceRefactor } from '@system/model/reference/loop-refactor'
import type MebacoElement from '@system/model/element/element'
import { ConfirmDialogController } from '@system/ui/feedback/confirm'
import type TreeNode from '@system/model/tree/tree-node'
import UnionDefinitionUpdatePolicy from '@system/model/type-system/union/union-definition-update-policy'
import { ReferenceImpact } from '@system/model/reference/impact'
import { translate } from '@system/application/localization'
import UnionUpdateConflictPresentation from './presentation/union-update-conflict-presentation'

namespace ElementUpdatePreflight {
  const findNode = (node: TreeNode.Node, nodeId: number): TreeNode.Node | null => {
    if (node.id === nodeId) return node
    for (const child of node.children) {
      const found = findNode(child, nodeId)
      if (found != null) return found
    }
    return null
  }

  const formatLoopReferenceSummary = (
    itemId: string,
    occurrenceCount: number,
    nodeCount: number,
  ): string => {
    const parameters = { itemId, occurrenceCount, nodeCount }
    if (occurrenceCount === 1 && nodeCount === 1) {
      return translate(
        'workspace.elementUpdate.loop.referenceSummary.oneOne',
        parameters,
      )
    }
    if (occurrenceCount === 1) {
      return translate(
        'workspace.elementUpdate.loop.referenceSummary.oneMany',
        parameters,
      )
    }
    if (nodeCount === 1) {
      return translate(
        'workspace.elementUpdate.loop.referenceSummary.manyOne',
        parameters,
      )
    }
    return translate(
      'workspace.elementUpdate.loop.referenceSummary.manyMany',
      parameters,
    )
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
          title: translate(
            'workspace.elementUpdate.launcherShortcutBlocked.title',
          ),
          message: [
            translate(
              'workspace.elementUpdate.launcherShortcutBlocked.message',
              { launcherId: previousElement.id },
            ),
            translate(
              'workspace.elementUpdate.launcherShortcutBlocked.note',
            ),
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
        await ConfirmDialogController.openNotice(
          UnionUpdateConflictPresentation.create(nextElement.id, conflicts),
        )
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
      title: translate('workspace.elementUpdate.loop.title'),
      message: [
        formatLoopReferenceSummary(
          previousElement.mode === 'collection' ? previousElement.itemId : '',
          plan.removedOccurrenceCount,
          nodeCount,
        ),
        ...plan.removedReferences.map((reference) => (
          `node-${reference.sourceNodeId}: ${reference.sourceLabel}`
        )),
        translate('workspace.elementUpdate.loop.warning'),
      ],
      choices: [
        { label: translate('common.action.cancel'), role: 'cancel' },
        {
          label: translate('common.action.updateAnyway'),
          role: 'proceed',
        },
      ],
    })
  }
}

export default ElementUpdatePreflight
