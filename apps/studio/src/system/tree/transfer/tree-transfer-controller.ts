import { get } from 'svelte/store'
import ActionMenuState from '../../action-menu/action-menu-state'
import DevelopInteractionController from '../../area/develop/interaction/develop-interaction-controller'
import DevelopInteractionMode from '../../area/develop/interaction/develop-interaction-mode'
import { developInteractionStore } from '../../area/develop/interaction/develop-interaction-store'
import type MebacoElement from '../../element/element'
import TreeStore from '../../store/tree-store'
import TreeNode from '../tree-node'
import TreeTransferCatalog from './tree-transfer-catalog'
import TreeTransferPlanner from './tree-transfer-planner'
import TreeTransferValidator from './tree-transfer-validator'

namespace TreeTransferController {
  export type PasteResult = {
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
    return insertBeforeDelete(items, action('Copy', () => {
      DevelopInteractionController.beginTreeTransfer({
        operation: 'copy',
        sourceNodeId: node.id,
        sourceKind: node.element.kind,
        sourceLabel: TreeTransferCatalog.getLabel(node.element),
      })
    }))
  }

  export const isPasteCandidate = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    mode: DevelopInteractionMode.Value = get(developInteractionStore),
  ): boolean => {
    if (mode.type !== 'tree-transfer') return false
    const sourceNode = TreeNode.findNode(rootNode, mode.sourceNodeId)
    return sourceNode != null
      && TreeTransferCatalog.canPasteTo(rootNode, sourceNode, node, mode.operation)
  }

  export const collectPasteCandidateNodeIds = (
    rootNode: TreeNode.Node,
    mode: DevelopInteractionMode.Value = get(developInteractionStore),
  ): ReadonlySet<number> => {
    if (mode.type !== 'tree-transfer') return new Set()
    const sourceNode = TreeNode.findNode(rootNode, mode.sourceNodeId)
    if (sourceNode == null) return new Set()
    const result = new Set<number>()
    const collect = (node: TreeNode.Node) => {
      if (TreeTransferCatalog.canPasteTo(rootNode, sourceNode, node, mode.operation)) {
        result.add(node.id)
      }
      node.children.forEach(collect)
    }
    collect(rootNode)
    return result
  }

  export const getTransferMenu = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): ActionMenuState.Item[] | null => {
    const mode = get(developInteractionStore)
    if (mode.type !== 'tree-transfer') return null
    if (!isPasteCandidate(rootNode, node, mode)) return []
    const { action } = ActionMenuState.createFactory()
    return [action('Paste here', () => {
      developInteractionStore.set({
        ...mode,
        phase: 'confirm',
        destinationNodeId: node.id,
      })
    })]
  }

  export const getNameError = (
    name: string,
  ): string | null => {
    const mode = get(developInteractionStore)
    if (
      mode.type !== 'tree-transfer'
      || mode.destinationNodeId == null
      || !TreeTransferCatalog.isTransferableKind(mode.sourceKind)
    ) return 'Select a destination.'
    const rootNode = get(TreeStore.rootNode)
    const destinationNode = TreeNode.findNode(rootNode, mode.destinationNodeId)
    if (destinationNode == null) return 'The selected destination is no longer available.'
    return TreeTransferCatalog.validateName(
      rootNode,
      destinationNode,
      mode.sourceKind,
      name,
    )
  }

  export const getSuggestedName = (): string => {
    const mode = get(developInteractionStore)
    if (mode.type !== 'tree-transfer') return ''
    const typeStyle = mode.sourceKind === 'style'
    const createCandidate = (index: number) => typeStyle
      ? `${mode.sourceLabel}-copy${index === 1 ? '' : `-${index}`}`
      : `${mode.sourceLabel}Copy${index === 1 ? '' : index}`
    for (let index = 1; index < 1000; index += 1) {
      const candidate = createCandidate(index)
      if (getNameError(candidate) == null) return candidate
    }
    return ''
  }

  export const paste = async (
    name: string,
  ): Promise<PasteResult> => {
    const mode = get(developInteractionStore)
    if (mode.type !== 'tree-transfer' || mode.destinationNodeId == null) {
      return { ok: false, error: 'Select a destination.' }
    }
    if (mode.operation !== 'copy') {
      return { ok: false, error: 'Move is not implemented yet.' }
    }

    try {
      const rootNode = get(TreeStore.rootNode)
      const plan = TreeTransferPlanner.copy(
        rootNode,
        mode.sourceNodeId,
        mode.destinationNodeId,
        name,
      )
      const structureError = TreeTransferValidator.validateStructure(
        plan.rootNode,
        plan.copiedNodeId,
      )
      if (structureError != null) return { ok: false, error: structureError }

      const expressionError = await TreeTransferValidator.validateExpressionScope(
        rootNode,
        mode.sourceNodeId,
        plan.rootNode,
        plan.copiedNodeId,
      )
      if (expressionError != null) return { ok: false, error: expressionError }

      developInteractionStore.set(DevelopInteractionMode.normal())
      TreeStore.commitRootChange(plan.rootNode)
      TreeStore.selectedNodeId.set(plan.copiedNodeId)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'The element could not be copied.',
      }
    }
  }

  export const isTransferableElement = (
    element: MebacoElement.Element,
  ): boolean => TreeTransferCatalog.isTransferableKind(element.kind)
}

export default TreeTransferController
