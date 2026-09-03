import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '../tree/tree-node'
import TreeDestinationActionId from '../tree/destination/tree-destination-action-id'
import KeyboardController from './keyboard-controller'
import type ShortcutCommand from './shortcut-command'
import ShortcutRegistry from './shortcut-registry'

const createContext = (
  selectedNode: TreeNode.Node,
  refreshTree = vi.fn(),
): ShortcutCommand.Context => {
  const rootNode: TreeNode.Node = {
    id: 1,
    element: { kind: 'project' },
    isOpen: true,
    children: [selectedNode],
  }

  return {
    rootNode,
    visibleNodes: [
      { node: rootNode, parentNode: null, isPreview: false },
      { node: selectedNode, parentNode: rootNode, isPreview: false },
    ],
    selectedNodeId: selectedNode.id,
    selectNode: vi.fn(),
    refreshTree,
    canDisable: (node) => node.element.kind === 'action',
    toggleDisabled: (nodeId) => {
      if (selectedNode.id !== nodeId) return
      selectedNode.disabled = !selectedNode.disabled
      refreshTree()
    },
    canReorder: () => false,
    reorder: vi.fn(),
    setSelectedAsCriteria: vi.fn(),
    raiseCriteria: vi.fn(),
    lowerCriteria: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    getContextMenu: () => [],
  }
}

const createEvent = (overrides: Partial<KeyboardEvent> = {}) => ({
  key: 'd',
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  ...overrides,
} as unknown as KeyboardEvent)

describe('KeyboardController disabled shortcut', () => {
  it('runs the selected node Copy action with Ctrl+C', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    }
    const context = createContext(selectedNode)
    const copy = vi.fn()
    context.getContextMenu = () => [{
      type: 'action',
      label: 'Copy',
      actionId: TreeDestinationActionId.copy,
      callback: copy,
    }]
    const event = createEvent({ key: 'c', ctrlKey: true })

    KeyboardController.handleKeydown(event, context)

    expect(copy).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('does not consume Ctrl+C when the selected node has no Copy action', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    }
    const event = createEvent({ key: 'c', ctrlKey: true })

    KeyboardController.handleKeydown(event, createContext(selectedNode))

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
  })

  it('runs Paste here with Ctrl+V only through destination commands', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    }
    const context = createContext(selectedNode)
    const paste = vi.fn()
    context.getContextMenu = () => [{
      type: 'action',
      label: 'Paste here',
      actionId: TreeDestinationActionId.pasteHere,
      callback: paste,
    }]
    const event = createEvent({ key: 'v', ctrlKey: true })

    KeyboardController.handleKeydown(event, context, ShortcutRegistry.destinationCommands)

    expect(paste).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('toggles the selected node when the element supports disabling', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'action', comment: '', source: '' },
      isOpen: true,
      children: [],
    }
    const refreshTree = vi.fn()
    const context = createContext(selectedNode, refreshTree)
    const event = createEvent()

    KeyboardController.handleKeydown(event, context)

    expect(selectedNode.disabled).toBe(true)
    expect(refreshTree).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()

    KeyboardController.handleKeydown(createEvent(), context)
    expect(selectedNode.disabled).toBe(false)
  })

  it('ignores the shortcut when the element cannot be disabled', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    }
    const refreshTree = vi.fn()
    const event = createEvent()

    KeyboardController.handleKeydown(event, createContext(selectedNode, refreshTree))

    expect(selectedNode.disabled).toBeUndefined()
    expect(refreshTree).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('does not toggle when a modifier key is pressed', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'action', comment: '', source: '' },
      isOpen: true,
      children: [],
    }
    const refreshTree = vi.fn()

    KeyboardController.handleKeydown(
      createEvent({ metaKey: true }),
      createContext(selectedNode, refreshTree),
    )

    expect(selectedNode.disabled).toBeUndefined()
    expect(refreshTree).not.toHaveBeenCalled()
  })

  it('reorders the selected node with Alt and an arrow key', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'action', comment: '', source: '' },
      isOpen: true,
      children: [],
    }
    const context = createContext(selectedNode)
    const reorder = vi.fn()
    context.canReorder = () => true
    context.reorder = reorder

    const event = createEvent({ key: 'ArrowUp', altKey: true })
    KeyboardController.handleKeydown(event, context)

    expect(reorder).toHaveBeenCalledWith(selectedNode.id, -1)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('sets Criteria with Q', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    }
    const context = createContext(selectedNode)
    const event = createEvent({ key: 'q' })

    KeyboardController.handleKeydown(event, context)

    expect(context.setSelectedAsCriteria).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('always consumes Alt+ArrowLeft even when there is no history', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    }
    const context = createContext(selectedNode)
    const event = createEvent({ key: 'ArrowLeft', altKey: true })

    KeyboardController.handleKeydown(event, context)

    expect(context.goBack).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('always consumes Alt+ArrowRight even when there is no history', () => {
    const selectedNode: TreeNode.Node = {
      id: 2,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    }
    const context = createContext(selectedNode)
    const event = createEvent({ key: 'ArrowRight', altKey: true })

    KeyboardController.handleKeydown(event, context)

    expect(context.goForward).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })
})
