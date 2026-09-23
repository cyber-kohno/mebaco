import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type Imports from '@system/model/app/import/imports'
import Transitions from '@system/model/app/import/transitions'
import ResourceImports from '@system/model/app/import/resource-imports'
import StorageImports from '@system/model/app/import/storage-imports'

namespace ImportsElementDefinition {
  export const definition = {
    kind: 'imports',
    treeLabel: { type: 'static', kindText: 'Import', tone: 'manager' },
    createInitialChildren: () => [
      { element: Transitions.create() },
      { element: ResourceImports.create() },
      { element: StorageImports.create() },
    ],
    getContextMenu: () => [],
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Imports.Element>
}

export default ImportsElementDefinition
