import type ActionMenuState from '../action-menu/action-menu-state'
import ShortcutCommand from './shortcut-command'

namespace ShortcutRegistry {
  const canUseSelectedRow = (context: ShortcutCommand.Context): boolean => (
    ShortcutCommand.getSelectedRow(context) != null
  )

  const findAction = (
    items: ActionMenuState.Item[],
    label: string,
  ): ActionMenuState.ActionItem | null => {
    for (const item of items) {
      if (item.type === 'action' && item.label === label) return item
      if (item.type === 'parent') {
        const child = findAction(item.children, label)
        if (child != null) return child
      }
    }

    return null
  }

  const canModifySelectedNode = (context: ShortcutCommand.Context): boolean => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return false

    return findAction(
      context.getContextMenu(selectedRow.node, selectedRow.parentNode),
      'Modify',
    ) != null
  }

  const modifySelectedNode = (context: ShortcutCommand.Context) => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return

    const modifyAction = findAction(
      context.getContextMenu(selectedRow.node, selectedRow.parentNode),
      'Modify',
    )
    modifyAction?.callback()
  }

  const canToggleDisabled = (context: ShortcutCommand.Context): boolean => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    return selectedRow != null
      && context.canDisable(selectedRow.node)
  }

  const toggleDisabled = (context: ShortcutCommand.Context) => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return

    context.toggleDisabled(selectedRow.node.id)
  }

  const canReorderSelectedNode = (
    context: ShortcutCommand.Context,
    direction: -1 | 1,
  ): boolean => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    return selectedRow != null
      && context.canReorder(selectedRow.node.id, direction)
  }

  const reorderSelectedNode = (
    context: ShortcutCommand.Context,
    direction: -1 | 1,
  ) => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return
    context.reorder(selectedRow.node.id, direction)
  }

  const moveSelection = (
    context: ShortcutCommand.Context,
    offset: -1 | 1,
  ) => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow?.parentNode == null) return

    const siblings = selectedRow.parentNode.children
    const currentIndex = siblings.findIndex((node) => node.id === selectedRow.node.id)
    if (currentIndex === -1) return

    const nextSibling = siblings[currentIndex + offset]
    if (nextSibling == null) return

    context.selectNode(nextSibling.id)
  }

  const openOrEnterSelectedNode = (context: ShortcutCommand.Context) => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return

    if (selectedRow.node.children.length === 0) return

    if (!selectedRow.node.isOpen) {
      selectedRow.node.isOpen = true
      context.refreshTree()
    }

    context.selectNode(selectedRow.node.children[0].id)
  }

  const leaveSelectedNode = (context: ShortcutCommand.Context) => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return

    if (selectedRow.parentNode != null) {
      context.selectNode(selectedRow.parentNode.id)
    }
  }

  const openSelectedNode = (context: ShortcutCommand.Context) => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return

    if (selectedRow.node.children.length > 0 && !selectedRow.node.isOpen) {
      selectedRow.node.isOpen = true
      context.refreshTree()
    }
  }

  const closeSelectedNode = (context: ShortcutCommand.Context) => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return

    if (selectedRow.node.children.length > 0 && selectedRow.node.isOpen) {
      selectedRow.node.isOpen = false
      context.refreshTree()
    }
  }

  export const commands: readonly ShortcutCommand.Command[] = [
    {
      id: 'modify-selected-node-enter',
      key: { key: 'Enter' },
      when: canModifySelectedNode,
      run: modifySelectedNode,
    },
    {
      id: 'modify-selected-node-e',
      key: { key: 'e' },
      when: canModifySelectedNode,
      run: modifySelectedNode,
    },
    {
      id: 'toggle-disabled',
      key: { key: 'd' },
      when: canToggleDisabled,
      run: toggleDisabled,
    },
    {
      id: 'move-selection-up',
      key: { key: 'ArrowUp' },
      when: canUseSelectedRow,
      run: (context) => moveSelection(context, -1),
    },
    {
      id: 'reorder-selected-node-up',
      key: { key: 'ArrowUp', alt: true },
      when: (context) => canReorderSelectedNode(context, -1),
      run: (context) => reorderSelectedNode(context, -1),
    },
    {
      id: 'move-selection-down',
      key: { key: 'ArrowDown' },
      when: canUseSelectedRow,
      run: (context) => moveSelection(context, 1),
    },
    {
      id: 'reorder-selected-node-down',
      key: { key: 'ArrowDown', alt: true },
      when: (context) => canReorderSelectedNode(context, 1),
      run: (context) => reorderSelectedNode(context, 1),
    },
    {
      id: 'open-selected-node',
      key: { key: 'ArrowRight', shift: true },
      when: canUseSelectedRow,
      run: openSelectedNode,
    },
    {
      id: 'close-selected-node',
      key: { key: 'ArrowLeft', shift: true },
      when: canUseSelectedRow,
      run: closeSelectedNode,
    },
    {
      id: 'open-or-enter-selected-node',
      key: { key: 'ArrowRight' },
      when: canUseSelectedRow,
      run: openOrEnterSelectedNode,
    },
    {
      id: 'leave-selected-node',
      key: { key: 'ArrowLeft' },
      when: canUseSelectedRow,
      run: leaveSelectedNode,
    },
  ]
}

export default ShortcutRegistry
