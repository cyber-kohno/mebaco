import type ActionMenuState from '../action-menu/action-menu-state'
import TreeDestinationActionId from '../tree/destination/tree-destination-action-id'
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

  const findActionById = (
    items: ActionMenuState.Item[],
    actionId: string,
  ): ActionMenuState.ActionItem | null => {
    for (const item of items) {
      if (item.type === 'action' && item.actionId === actionId) return item
      if (item.type === 'parent') {
        const child = findActionById(item.children, actionId)
        if (child != null) return child
      }
    }

    return null
  }

  const getSelectedAction = (
    context: ShortcutCommand.Context,
    actionId: string,
  ): ActionMenuState.ActionItem | null => {
    const selectedRow = ShortcutCommand.getSelectedRow(context)
    if (selectedRow == null) return null

    return findActionById(
      context.getContextMenu(selectedRow.node, selectedRow.parentNode),
      actionId,
    )
  }

  const runSelectedAction = (
    context: ShortcutCommand.Context,
    actionId: string,
  ) => {
    void getSelectedAction(context, actionId)?.callback()
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
      id: 'copy-selected-node',
      key: { key: 'c', ctrl: true },
      when: (context) => getSelectedAction(context, TreeDestinationActionId.copy) != null,
      run: (context) => runSelectedAction(context, TreeDestinationActionId.copy),
    },
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
      id: 'set-selected-as-criteria',
      key: { key: 'q' },
      when: canUseSelectedRow,
      run: (context) => context.setSelectedAsCriteria(),
    },
    {
      id: 'raise-criteria',
      key: { key: 'ArrowLeft', ctrl: true },
      when: canUseSelectedRow,
      run: (context) => context.raiseCriteria(),
    },
    {
      id: 'lower-criteria',
      key: { key: 'ArrowRight', ctrl: true },
      when: canUseSelectedRow,
      run: (context) => context.lowerCriteria(),
    },
    {
      id: 'navigate-back',
      key: { key: 'ArrowLeft', alt: true },
      when: () => true,
      run: (context) => context.goBack(),
    },
    {
      id: 'navigate-forward',
      key: { key: 'ArrowRight', alt: true },
      when: () => true,
      run: (context) => context.goForward(),
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

  export const destinationCommands: readonly ShortcutCommand.Command[] = [
    {
      id: 'paste-to-selected-node',
      key: { key: 'v', ctrl: true },
      when: (context) => getSelectedAction(context, TreeDestinationActionId.pasteHere) != null,
      run: (context) => runSelectedAction(context, TreeDestinationActionId.pasteHere),
    },
  ]
}

export default ShortcutRegistry
