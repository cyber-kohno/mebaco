import type ElementDefinition from '../../element-definition'
import DebugConfigurationsElement from './debug-configurations-element'
import DebugLogElement from './debug-log-element'

namespace DebugElement {
  export type Kind = 'debug'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'debug' })

  export const definition = {
    kind: 'debug',
    treeLabel: { type: 'static', kindText: 'Debug', tone: 'manager' },
    createInitialChildren: () => [
      { element: DebugConfigurationsElement.create() },
      { element: DebugLogElement.create() },
    ],
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default DebugElement
