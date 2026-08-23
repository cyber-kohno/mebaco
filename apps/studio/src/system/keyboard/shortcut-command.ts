import type ActionMenuState from '../action-menu/action-menu-state'
import type TreeNode from '../tree/tree-node'

namespace ShortcutCommand {
  export type Key = {
    key: string
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  }

  export type VisibleNode = {
    node: TreeNode.Node
    parentNode: TreeNode.Node | null
    isPreview: boolean
  }

  export type Context = {
    rootNode: TreeNode.Node
    visibleNodes: VisibleNode[]
    selectedNodeId: number
    selectNode: (nodeId: number) => void
    refreshTree: () => void
    canDisable: (node: TreeNode.Node) => boolean
    toggleDisabled: (nodeId: number) => void
    canReorder: (nodeId: number, direction: -1 | 1) => boolean
    reorder: (nodeId: number, direction: -1 | 1) => void
    getContextMenu: (node: TreeNode.Node, parentNode: TreeNode.Node | null) => ActionMenuState.Item[]
  }

  export type Command = {
    id: string
    key: Key
    when: (context: Context) => boolean
    run: (context: Context) => void
  }

  export const getSelectedRow = (context: Context): VisibleNode | null => (
    context.visibleNodes.find((row) => row.node.id === context.selectedNodeId && !row.isPreview) ?? null
  )
}

export default ShortcutCommand
