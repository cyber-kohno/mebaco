import { get } from 'svelte/store'
import { actionMenuStore } from '../action-menu/action-menu-store'
import { developScreenStore } from '../area/develop/develop-screen-store'
import ElementRegistry from '../element/element-registry'
import { elementDialogStore } from '../element-dialog/element-dialog-store'
import { confirmDialogStore } from '../feedback/confirm/confirm-dialog-state'
import RuntimeSessionStore from '../runtime/runtime-session-store'
import { appAreaStore } from '../navigation/app-area-store'
import TreeStore from '../store/tree-store'
import TreeNode from '../tree/tree-node'
import TreeNavigationController from '../tree/tree-navigation-controller'
import TreeViewportController from '../tree/tree-viewport-controller'
import CommandController from '../terminal/command-controller'
import { commandSessionStore } from '../terminal/command-session-store'
import ReferenceGraphController from '../analysis/reference/reference-graph-controller'
import KeyboardController from './keyboard-controller'
import DevelopInteractionController from '../area/develop/interaction/develop-interaction-controller'
import { developInteractionStore } from '../area/develop/interaction/develop-interaction-store'
import TreeContextMenuResolver from '../tree/tree-context-menu-resolver'
import type ShortcutCommand from './shortcut-command'
import ShortcutRegistry from './shortcut-registry'

namespace AppKeyboardController {
  const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false
    return (
      target.matches('input, textarea, select')
      || target.isContentEditable
      || target.closest('[contenteditable="true"]') != null
    )
  }

  const isNativeActivation = (event: KeyboardEvent): boolean => (
    (event.key === 'Enter' || event.key === ' ')
    && event.target instanceof HTMLElement
    && event.target.closest('button, a[href]') != null
  )

  const hasBlockingLayer = (): boolean => (
    get(elementDialogStore) != null
    || get(actionMenuStore) != null
    || get(commandSessionStore) != null
    || get(confirmDialogStore) != null
    || get(RuntimeSessionStore.store) != null
  )

  const createShortcutContext = (): ShortcutCommand.Context => {
    const rootNode = get(TreeStore.rootNode)
    const displayRootNode = TreeViewportController.resolveDisplayRoot(
      rootNode,
      get(TreeViewportController.state),
    )

    return {
      rootNode,
      visibleNodes: TreeNode.getVisibleNodes(displayRootNode),
      selectedNodeId: get(TreeStore.selectedNodeId),
      selectNode: (nodeId) => {
        TreeStore.selectedNodeId.set(nodeId)
      },
      refreshTree: () => {
        TreeStore.rootNode.set(TreeNode.clone(rootNode))
      },
      canDisable: (node) => ElementRegistry.get(node.element.kind).canDisable,
      toggleDisabled: TreeStore.toggleDisabled,
      canReorder: (nodeId, direction) => TreeStore.canMoveNode(nodeId, direction),
      reorder: (nodeId, direction) => TreeStore.moveNode(nodeId, direction),
      setSelectedAsCriteria: () => {
        TreeViewportController.setSelectedAsCriteria(
          get(TreeStore.rootNode),
          get(TreeStore.selectedNodeId),
        )
      },
      raiseCriteria: () => {
        TreeViewportController.raiseCriteria(
          get(TreeStore.rootNode),
          get(TreeStore.selectedNodeId),
        )
      },
      lowerCriteria: () => {
        TreeViewportController.lowerCriteria(
          get(TreeStore.rootNode),
          get(TreeStore.selectedNodeId),
        )
      },
      goBack: TreeNavigationController.goBack,
      goForward: TreeNavigationController.goForward,
      getContextMenu: (node, parentNode) => (
        TreeContextMenuResolver.resolve(rootNode, node, parentNode)
      ),
    }
  }

  export const handleKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (
      get(appAreaStore) !== 'develop'
      || get(developScreenStore) !== 'workspace'
    ) return
    const interaction = get(developInteractionStore)
    if (interaction.type !== 'normal') {
      if (
        event.key === 'Escape'
        && get(actionMenuStore) == null
        && get(elementDialogStore) == null
        && get(confirmDialogStore) == null
      ) {
        event.preventDefault()
        event.stopPropagation()
        if (interaction.phase === 'confirm') {
          DevelopInteractionController.returnToDestinationSelection()
        } else {
          DevelopInteractionController.cancel()
        }
        return
      }
      if (
        interaction.operation.type === 'copy'
        && interaction.phase === 'select-destination'
        && !hasBlockingLayer()
        && !isEditableTarget(event.target)
        && !isNativeActivation(event)
      ) {
        KeyboardController.handleKeydown(
          event,
          createShortcutContext(),
          ShortcutRegistry.destinationCommands,
        )
      }
      return
    }
    if (get(commandSessionStore) != null) return
    if (
      event.key.toLowerCase() === 't'
      && !event.ctrlKey
      && !event.altKey
      && !event.metaKey
      && !event.shiftKey
      && !hasBlockingLayer()
      && !isEditableTarget(event.target)
      && !isNativeActivation(event)
    ) {
      event.preventDefault()
      event.stopPropagation()
      CommandController.open()
      return
    }
    if (
      event.key.toLowerCase() === 'r'
      && !event.ctrlKey
      && !event.altKey
      && !event.metaKey
      && !event.shiftKey
      && !hasBlockingLayer()
      && !isEditableTarget(event.target)
      && !isNativeActivation(event)
    ) {
      event.preventDefault()
      event.stopPropagation()
      ReferenceGraphController.toggle()
      return
    }
    if (
      hasBlockingLayer()
      || isEditableTarget(event.target)
      || isNativeActivation(event)
    ) return

    KeyboardController.handleKeydown(event, createShortcutContext())
  }
}

export default AppKeyboardController
