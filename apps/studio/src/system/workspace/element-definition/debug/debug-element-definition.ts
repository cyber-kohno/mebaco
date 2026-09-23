import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import Debug from '@system/model/debug/debug'
import DebugConfigurations from '@system/model/debug/debug-configurations'
import DebugLog from '@system/model/debug/debug-log'
import DebugLaunchShortcuts from '@system/model/debug/debug-launch-shortcuts'

namespace DebugElementDefinition {
  export const definition = {
    kind: 'debug',
    treeLabel: { type: 'static', kindText: 'Debug', tone: 'manager' },
    createInitialChildren: () => [
      { element: DebugConfigurations.create() },
      { element: DebugLaunchShortcuts.create() },
      { element: DebugLog.create() },
    ],
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Debug.Element>
}

export default DebugElementDefinition
