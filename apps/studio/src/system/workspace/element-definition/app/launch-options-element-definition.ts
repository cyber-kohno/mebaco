import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import LaunchArguments from '@system/model/app/launch-arguments'
import type LaunchOptions from '@system/model/app/launch-options'

namespace LaunchOptionsElementDefinition {
  export const definition = {
    kind: 'launch-options',
    treeLabel: { type: 'static', kindText: 'Launch', tone: 'manager' },
    createInitialChildren: () => [{ element: LaunchArguments.create() }],
    getContextMenu: () => [], childSlots: [], canDisable: false,
  } satisfies ElementDefinition.Definition<LaunchOptions.Element>
}
export default LaunchOptionsElementDefinition
