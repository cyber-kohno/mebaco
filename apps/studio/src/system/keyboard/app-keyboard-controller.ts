import { get } from 'svelte/store'
import { actionMenuStore } from '../action-menu/action-menu-store'
import ElementRegistry from '../element/element-registry'
import { elementDialogStore } from '../element-dialog/element-dialog-store'
import { confirmDialogStore } from '../feedback/confirm/confirm-dialog-state'
import RuntimeSessionStore from '../runtime/runtime-session-store'
import { screenStore } from '../store/screen-store'
import TreeStore from '../store/tree-store'
import TreeNode from '../tree/tree-node'
import CommandController from '../command/command-controller'
import { commandSessionStore } from '../command/command-session-store'
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
    if (get(screenStore) !== 'develop') return
    if (get(commandSessionStore) != null) return
    if (event.key.toLowerCase() === 'k' && event.ctrlKey && !hasBlockingLayer()) {
      event.preventDefault()
      event.stopPropagation()
      CommandController.open()
      return
    }
    if (
      hasBlockingLayer()
      || isEditableTarget(event.target)
      || isNativeActivation(event)
    ) return

    const rootNode = get(TreeStore.rootNode)
    KeyboardController.handleKeydown(event, {
      rootNode,
      visibleNodes: TreeNode.getVisibleNodes(rootNode),
      selectedNodeId: get(TreeStore.selectedNodeId),
      selectNode: (nodeId) => {
        TreeStore.selectedNodeId.set(nodeId)
      },
      refreshTree: () => {
        TreeStore.rootNode.set(TreeNode.clone(rootNode))
      },
      canDisable: (node) => ElementRegistry.get(node.element.kind).canDisable,
      toggleDisabled: TreeStore.toggleDisabled,
      getContextMenu: (node, parentNode) => (
        ElementRegistry.get(node.element.kind).getContextMenu({
          element: node.element,
          node,
          parentNode,
          rootNode,
        })
      ),
    })
  }
}

export default AppKeyboardController
