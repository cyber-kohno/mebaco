import type ElementDefinition from '../../../element-definition'
import TransitionsElement from './transitions-element'
import ResourceImportsElement from './resource-imports-element'

namespace ImportsElement {
  export type Kind = 'imports'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'imports' })

  export const definition = {
    kind: 'imports',
    treeLabel: { type: 'static', kindText: 'Import', tone: 'manager' },
    createInitialChildren: () => [
      { element: TransitionsElement.create() },
      { element: ResourceImportsElement.create() },
    ],
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ImportsElement
