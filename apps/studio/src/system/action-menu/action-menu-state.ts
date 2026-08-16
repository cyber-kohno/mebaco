namespace ActionMenuState {
  export type ItemRole = 'normal' | 'warning' | 'danger'

  export type ActionItem = {
    type: 'action'
    label: string
    role?: ItemRole
    keepOpen?: boolean
    callback: () => void | Promise<void>
  }

  export type ParentItem = {
    type: 'parent'
    label: string
    children: Item[]
  }

  export type Item = ActionItem | ParentItem

  export type Placement = {
    left: number
    top: number
  }

  export type Value = {
    path: number[]
    items: Item[]
    placement: Placement
  }

  export const createInitial = (items: Item[], placement: Placement): Value => ({
    path: [0],
    items,
    placement,
  })

  export const createFactory = () => ({
    action: (
      label: string,
      callback: ActionItem['callback'],
      option?: ItemRole | Pick<ActionItem, 'role' | 'keepOpen'>,
    ): ActionItem => {
      const item: ActionItem = {
        type: 'action',
        label,
        callback,
      }

      if (typeof option === 'string') {
        item.role = option
      } else if (option != null) {
        item.role = option.role
        item.keepOpen = option.keepOpen
      }

      return item
    },
    parent: (label: string, children: Item[]): ParentItem => ({
      type: 'parent',
      label,
      children,
    }),
  })
}

export default ActionMenuState
