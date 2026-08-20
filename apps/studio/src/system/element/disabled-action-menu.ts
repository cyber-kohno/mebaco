import ActionMenuState from '../action-menu/action-menu-state'

namespace DisabledActionMenu {
  export const add = (
    items: ActionMenuState.Item[],
    disabled: boolean,
    toggle: () => void,
  ): ActionMenuState.Item[] => {
    const { action } = ActionMenuState.createFactory()
    const nextItems = [...items]
    const deleteIndex = nextItems.findIndex((item) => (
      item.type === 'action' && item.label === 'Delete'
    ))

    nextItems.splice(
      deleteIndex >= 0 ? deleteIndex : nextItems.length,
      0,
      action(disabled ? 'Enabled' : 'Disabled', toggle),
    )
    return nextItems
  }
}

export default DisabledActionMenu
