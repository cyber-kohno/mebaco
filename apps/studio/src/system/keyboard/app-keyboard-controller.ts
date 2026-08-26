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
import IdRefactoring from '../refactoring/id-refactoring'
import TreeViewportController from '../tree/tree-viewport-controller'
import CommandController from '../terminal/command-controller'
import { commandSessionStore } from '../terminal/command-session-store'
import ReferenceGraphController from '../analysis/reference-graph-controller'
import KeyboardController from './keyboard-controller'

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

  export const handleKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (
      get(appAreaStore) !== 'develop'
      || get(developScreenStore) !== 'workspace'
    ) return
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
      ReferenceGraphController.toggle(get(TreeStore.selectedNodeId))
      return
    }
    if (
      hasBlockingLayer()
      || isEditableTarget(event.target)
      || isNativeActivation(event)
    ) return

    const rootNode = get(TreeStore.rootNode)
    const displayRootNode = TreeViewportController.resolveDisplayRoot(
      rootNode,
      get(TreeViewportController.state),
    )
    KeyboardController.handleKeydown(event, {
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
        IdRefactoring.add(ElementRegistry.get(node.element.kind).getContextMenu({
          element: node.element,
          node,
          parentNode,
          rootNode,
        }), { element: node.element, node, parentNode, rootNode })
      ),
    })
  }
}

export default AppKeyboardController
