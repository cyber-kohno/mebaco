import { get } from 'svelte/store'
import ActionMenuState from './action-menu-state'
import { actionMenuStore } from './action-menu-store'

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
    const result = item.callback()
    if (result instanceof Promise) {
      result.catch((error) => {
        console.error('Action menu callback failed:', error)
      })
    }
  }
}

export default ActionMenu
