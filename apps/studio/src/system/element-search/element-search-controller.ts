import { get } from 'svelte/store'
import TreeStore from '../store/tree-store'
import TreeNavigationController from '../tree/tree-navigation-controller'
import ElementSearchCatalog from './element-search-catalog'
import ElementSearchQuery from './element-search-query'
import { elementSearchStore } from './element-search-store'
import type ElementSearchTypes from './element-search-types'

namespace ElementSearchController {
  const stopEvent = (event: KeyboardEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  export const open = () => {
    const entries = ElementSearchCatalog.create(get(TreeStore.rootNode))
    elementSearchStore.set({
      query: '',
      entries,
      selectedIndex: entries.length > 0 ? 0 : -1,
    })
  }

  export const close = () => {
    elementSearchStore.set(null)
  }

  export const setQuery = (query: string) => {
    elementSearchStore.update((session) => {
      if (session == null) return null
      const resultCount = ElementSearchQuery.filter(session.entries, query).length
      return {
        ...session,
        query,
        selectedIndex: resultCount > 0 ? 0 : -1,
      }
    })
  }

  export const setSelectedIndex = (selectedIndex: number) => {
    elementSearchStore.update((session) => session == null
      ? null
      : { ...session, selectedIndex })
  }

  export const moveSelection = (offset: -1 | 1) => {
    elementSearchStore.update((session) => {
      if (session == null) return null
      const resultCount = ElementSearchQuery.filter(session.entries, session.query).length
      if (resultCount === 0) return { ...session, selectedIndex: -1 }
      const currentIndex = session.selectedIndex < 0 ? 0 : session.selectedIndex
      return {
        ...session,
        selectedIndex: Math.max(0, Math.min(resultCount - 1, currentIndex + offset)),
      }
    })
  }

  export const activate = (
    entry: ElementSearchTypes.Entry,
  ): boolean => {
    close()
    return TreeNavigationController.jumpToNode(entry.nodeId)
  }

  export const activateSelected = (): boolean => {
    const session = get(elementSearchStore)
    if (session == null || session.selectedIndex < 0) return false
    const entry = ElementSearchQuery.filter(session.entries, session.query)[session.selectedIndex]
    return entry == null ? false : activate(entry)
  }

  export const handleKeydown = (event: KeyboardEvent) => {
    if (get(elementSearchStore) == null || event.defaultPrevented) return

    switch (event.key) {
      case 'Escape':
        stopEvent(event)
        close()
        break
      case 'ArrowUp':
        stopEvent(event)
        moveSelection(-1)
        break
      case 'ArrowDown':
        stopEvent(event)
        moveSelection(1)
        break
      case 'Enter':
        stopEvent(event)
        activateSelected()
        break
    }
  }
}

export default ElementSearchController
