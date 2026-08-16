import type ElementDefinition from '../../element-definition'

namespace LaunchersElement {
  export type Kind = 'launchers'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'launchers',
  })

  export const definition = {
    kind: 'launchers',
    treeLabel: {
      type: 'static',
      kindText: 'Launchers',
      tone: 'folder',
    },
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default LaunchersElement
