import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '../tree/tree-node'
import KeyboardController from './keyboard-controller'
import type ShortcutCommand from './shortcut-command'

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
})
