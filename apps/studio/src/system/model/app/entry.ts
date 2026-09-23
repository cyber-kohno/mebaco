import type ComponentReference from '@system/model/component/component-reference'

namespace Entry {
  export type Kind = 'entry'

  export type Element = {
    kind: Kind
    componentId: string | null
    propBindings: ComponentReference.Binding[]
  }

  export const create = (): Element => ({
    kind: 'entry',
    componentId: null,
    propBindings: [],
  })
}

export default Entry
