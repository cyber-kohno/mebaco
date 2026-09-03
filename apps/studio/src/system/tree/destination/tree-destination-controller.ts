import { get } from 'svelte/store'
import ActionMenuState from '../../action-menu/action-menu-state'
import DevelopInteractionController from '../../area/develop/interaction/develop-interaction-controller'
import type DevelopInteractionMode from '../../area/develop/interaction/develop-interaction-mode'
import { developInteractionStore } from '../../area/develop/interaction/develop-interaction-store'
import TreeStore from '../../store/tree-store'
import ExpressionVerificationStore from '../../validation/expression/expression-verification-store'
import TreeNode from '../tree-node'
import TreeTransferCatalog from '../transfer/tree-transfer-catalog'
import TreeDestinationActionId from './tree-destination-action-id'
import TreeDestinationOperation from './tree-destination-operation'

namespace TreeDestinationController {
  export type CommitResult = {
    ok: boolean
    error?: string
  }

  const insertBeforeDelete = (
    items: ActionMenuState.Item[],
    item: ActionMenuState.Item,
  ): ActionMenuState.Item[] => {
    const next = [...items]
    const deleteIndex = next.findIndex((candidate) => (
      candidate.type === 'action' && candidate.label === 'Delete'
    ))
    next.splice(deleteIndex < 0 ? next.length : deleteIndex, 0, item)
    return next
  }

  export const addCopyAction = (
    items: ActionMenuState.Item[],
    node: TreeNode.Node,
  ): ActionMenuState.Item[] => {
    if (!TreeTransferCatalog.isTransferableKind(node.element.kind)) return items
    const { action } = ActionMenuState.createFactory()
    return insertBeforeDelete(items, action(
      'Copy',
      () => {
        DevelopInteractionController.beginDestinationTransaction({
          operation: { type: 'copy', sourceKind: node.element.kind },
          sourceNodeId: node.id,
          sourceLabel: TreeTransferCatalog.getLabel(node.element),
        })
      },
      { actionId: TreeDestinationActionId.copy },
    ))
  }

  export const beginSignatureExtraction = (
    functionNode: TreeNode.Node & {
      element: Extract<TreeNode.Node['element'], { kind: 'function' }>
    },
  ) => {
    if (functionNode.element.signature.mode !== 'inline') return
    DevelopInteractionController.beginDestinationTransaction({
      operation: { type: 'extract-signature' },
      sourceNodeId: functionNode.id,
      sourceLabel: functionNode.element.id,
    })
  }

  export const addSignatureExtractionAction = (
    items: ActionMenuState.Item[],
    node: TreeNode.Node,
  ): ActionMenuState.Item[] => {
    if (node.element.kind !== 'function' || node.element.signature.mode !== 'inline') {
      return items
    }
    const { action } = ActionMenuState.createFactory()
    return insertBeforeDelete(items, action('Extract signature', () => {
      beginSignatureExtraction(
        node as TreeNode.Node & { element: Extract<TreeNode.Node['element'], { kind: 'function' }> },
      )
    }))
  }

  export const isDestinationCandidate = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    mode: DevelopInteractionMode.Value = get(developInteractionStore),
  ): boolean => mode.type === 'destination-transaction'
    && TreeDestinationOperation.isDestinationCandidate(rootNode, node, mode)

  export const collectDestinationCandidateNodeIds = (
    rootNode: TreeNode.Node,
    mode: DevelopInteractionMode.Value = get(developInteractionStore),
  ): ReadonlySet<number> => {
    if (mode.type !== 'destination-transaction') return new Set()
    const result = new Set<number>()
    const collect = (node: TreeNode.Node) => {
      if (TreeDestinationOperation.isDestinationCandidate(rootNode, node, mode)) {
        result.add(node.id)
      }
      node.children.forEach(collect)
    }
    collect(rootNode)
    return result
  }

  export const getDestinationMenu = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): ActionMenuState.Item[] | null => {
    const mode = get(developInteractionStore)
    if (mode.type !== 'destination-transaction') return null
    if (!isDestinationCandidate(rootNode, node, mode)) return []
    const { action } = ActionMenuState.createFactory()
    const presentation = TreeDestinationOperation.getPresentation(mode)
    return [action(
      presentation.destinationActionLabel,
      () => {
        developInteractionStore.set({
          ...mode,
          phase: 'confirm',
          destinationNodeId: node.id,
        })
      },
      mode.operation.type === 'copy'
        ? { actionId: TreeDestinationActionId.pasteHere }
        : undefined,
    )]
  }

  export const getNameError = (
    name: string,
  ): string | null => {
    const mode = get(developInteractionStore)
    if (mode.type !== 'destination-transaction' || mode.destinationNodeId == null) {
      return 'Select a destination.'
    }
    const rootNode = get(TreeStore.rootNode)
    const destinationNode = TreeNode.findNode(rootNode, mode.destinationNodeId)
    if (destinationNode == null) return 'The selected destination is no longer available.'
    if (
      mode.operation.type === 'copy'
      && TreeTransferCatalog.isTransferableKind(mode.operation.sourceKind)
      && !TreeTransferCatalog.requiresName(mode.operation.sourceKind)
    ) return null
    return TreeDestinationOperation.validateName(rootNode, destinationNode, mode, name)
  }

  export const getSuggestedName = (): string => {
    const mode = get(developInteractionStore)
    if (mode.type !== 'destination-transaction') return ''
    if (mode.operation.type === 'extract-signature') return ''
    for (let index = 1; index < 1000; index += 1) {
      const candidate = TreeDestinationOperation.createSuggestedName(mode, index)
      if (getNameError(candidate) == null) return candidate
    }
    return ''
  }

  export const getPresentation = (): TreeDestinationOperation.Presentation | null => {
    const mode = get(developInteractionStore)
    return mode.type === 'destination-transaction'
      ? TreeDestinationOperation.getPresentation(mode)
      : null
  }

  export const commit = async (
    name: string,
  ): Promise<CommitResult> => {
    const mode = get(developInteractionStore)
    if (mode.type !== 'destination-transaction' || mode.destinationNodeId == null) {
      return { ok: false, error: 'Select a destination.' }
    }
    const presentation = TreeDestinationOperation.getPresentation(mode)

    try {
      const previousRoot = get(TreeStore.rootNode)
      const plan = await TreeDestinationOperation.createPlan(previousRoot, mode, name)
      const entries = get(ExpressionVerificationStore.entries)
      const preserved = plan.preserveVerificationNodeIds.flatMap((nodeId) => {
        const node = TreeNode.findNode(previousRoot, nodeId)
        const entry = entries[nodeId]
        return node != null
          && entry != null
          && (entry.status === 'verified' || entry.status === 'error')
          && ExpressionVerificationStore.getStatus(previousRoot, node, entries) === entry.status
          ? [{ nodeId, result: { status: entry.status, messages: entry.messages } }]
          : []
      })

      developInteractionStore.set({ type: 'normal' })
      TreeStore.commitRootChange(plan.rootNode)
      preserved.forEach(({ nodeId, result }) => {
        const node = TreeNode.findNode(plan.rootNode, nodeId)
        if (node != null) ExpressionVerificationStore.setResult(node, result)
      })
      TreeStore.selectedNodeId.set(plan.selectedNodeId)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : presentation.failureMessage,
      }
    }
  }
}

export default TreeDestinationController
