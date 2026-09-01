import type ElementDefinition from '../../../element-definition'
import LaunchArgumentsElement from './launch-arguments-element'

namespace LaunchOptionsElement {
  export type Kind = 'launch-options'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'launch-options' })
  export const definition = {
    kind: 'launch-options',
    treeLabel: { type: 'static', kindText: 'Launch', tone: 'manager' },
    createInitialChildren: () => [{ element: LaunchArgumentsElement.create() }],
    getContextMenu: () => [], childSlots: [], canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}
export default LaunchOptionsElement
