import type ComponentReference from '@system/model/component/component-reference'

namespace Transition {
  export type Kind = 'transition'
  export type Element = {
    kind: Kind
    appId: string | null
    argumentBindings: ComponentReference.Binding[]
  }

  export const create = (): Element => ({
    kind: 'transition',
    appId: null,
    argumentBindings: [],
  })
}

export default Transition
