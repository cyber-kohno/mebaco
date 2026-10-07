import { get } from 'svelte/store'
import ActionMenuState from './action-menu-state'
import { actionMenuStore } from './action-menu-store'
import McpEditSessionState from '@system/mcp/mcp-edit-session-state'

namespace ActionMenu {
  export const getLevelItems = (
    rootItems: ActionMenuState.Item[],
    path: number[],
  ): ActionMenuState.Item[] => {
    let items = rootItems

    for (let depth = 0; depth < path.length - 1; depth += 1) {
      const item = items[path[depth]]
      if (item?.type !== 'parent') return []
      items = item.children
    }

    return items
  }

  export const openAt = (
    items: ActionMenuState.Item[],
    left: number,
    top: number,
  ) => {
    if (items.length === 0) {
      actionMenuStore.set(null)
      return
    }

    actionMenuStore.set(ActionMenuState.createInitial(items, { left, top }))
  }

  export const close = () => {
    actionMenuStore.set(null)
  }

  export const hover = (depth: number, index: number) => {
    const actionMenu = get(actionMenuStore)
    if (actionMenu == null) return

    actionMenuStore.set({
      ...actionMenu,
      path: [...actionMenu.path.slice(0, depth), index],
    })
  }

  export const enter = () => {
    const actionMenu = get(actionMenuStore)
    if (actionMenu == null) return

    const items = getLevelItems(actionMenu.items, actionMenu.path)
    const item = items[actionMenu.path[actionMenu.path.length - 1]]
    if (item == null) {
      close()
      return
    }

    if (item.type === 'parent') return

    if (item.keepOpen !== true) close()
    try {
      const result = item.callback()
      if (result instanceof Promise) {
        result.catch((error) => {
          // A rejected user edit has already been explained by the common guard.
          if (!(error instanceof McpEditSessionState.Error)) console.error('Action menu callback failed:', error)
        })
      }
    } catch (error) {
      if (!(error instanceof McpEditSessionState.Error)) throw error
    }
  }
}

export default ActionMenu
