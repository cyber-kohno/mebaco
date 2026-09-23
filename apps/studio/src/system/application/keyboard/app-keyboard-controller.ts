import { get } from 'svelte/store'
import { actionMenuStore } from '@system/ui/action-menu/action-menu-store'
import { developScreenStore } from '@system/workspace/screen'
import ElementRegistry from '@system/workspace/element-definition/element-registry'
import { elementDialogStore } from '@system/workspace/element-editor/element-dialog-store'
import { confirmDialogStore } from '@system/ui/feedback/confirm'
import RuntimeSessionStore from '../../runtime/runtime-session-store'
import { appAreaStore } from '@system/application/navigation'
import TreeStore from '@system/workspace/tree/state'
import TreeNode from '@system/model/tree/tree-node'
import {
  TreeNavigationController,
  TreeViewportController,
} from '@system/workspace/tree/navigation'
import CommandController from '../../terminal/command-controller'
import { commandSessionStore } from '../../terminal/command-session-store'
import { ElementSearchController } from '@system/workspace/search/controller'
import { elementSearchStore } from '@system/workspace/search/state'
import { ReferenceGraphController } from '@system/workspace/reference/controller'
import { KeyboardController } from '@system/workspace/shortcut/controller'
import {
  DevelopInteractionController,
} from '@system/workspace/interaction/controller'
import { developInteractionStore } from '@system/workspace/interaction/state'
import { TreeContextMenuResolver } from '@system/workspace/tree/context-menu'
import type { ShortcutCommand } from '@system/workspace/shortcut/command'
import { ShortcutRegistry } from '@system/workspace/shortcut/registry'
import DebugLaunchShortcutController from '@system/application/debug/debug-launch-shortcut-controller'
import ProjectFile from '../../project/project-file'
import ProjectSession from '../../project/project-session-store'

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
    || get(elementSearchStore) != null
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
      launchAppShortcut: (appNodeId) => {
        DebugLaunchShortcutController.launch(rootNode, appNodeId)
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
    if (
      event.key.toLowerCase() === 's'
      && event.ctrlKey
      && !event.altKey
      && !event.metaKey
      && !event.shiftKey
    ) {
      event.preventDefault()
      event.stopPropagation()
      if (
        !event.repeat
        && interaction.type === 'normal'
        && !hasBlockingLayer()
        && get(ProjectSession.store).isDirty
      ) {
        void ProjectFile.saveWithAlert()
      }
      return
    }
    if (
      (
        event.key.toLowerCase() === 'p'
        || event.key.toLowerCase() === 'n'
      )
      && event.ctrlKey
      && !event.altKey
      && !event.metaKey
      && !event.shiftKey
    ) {
      event.preventDefault()
      event.stopPropagation()
      if (interaction.type === 'normal' && !hasBlockingLayer()) {
        ElementSearchController.open(
          event.key.toLowerCase() === 'n' ? 'node-id' : 'element-id',
        )
      }
      return
    }
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
        (
          interaction.operation.type === 'copy'
          || interaction.operation.type === 'move'
        )
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
