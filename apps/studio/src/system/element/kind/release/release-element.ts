import type ElementDefinition from '../../element-definition'
import BundlesElement from './bundles-element'

namespace ReleaseElement {
  export type Kind = 'release'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'release' })

  export const definition = {
    kind: 'release',
    treeLabel: { type: 'static', kindText: 'Release', tone: 'manager' },
    createInitialChildren: () => [{ element: BundlesElement.create() }],
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ReleaseElement
