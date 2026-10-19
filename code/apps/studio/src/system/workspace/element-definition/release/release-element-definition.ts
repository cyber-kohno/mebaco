import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import Bundles from '@system/model/release/bundles'
import Release from '@system/model/release/release'

namespace ReleaseElementDefinition {
  export const definition = {
    kind: 'release',
    treeLabel: { type: 'static', kindText: 'Release', tone: 'manager' },
    createInitialChildren: () => [{ element: Bundles.create() }],
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Release.Element>
}

export default ReleaseElementDefinition
