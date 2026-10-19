import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import DirectoryResourceElementDefinition from '@system/workspace/element-definition/resource/directory-resource-element-definition'
import TextResourceElementDefinition from '@system/workspace/element-definition/resource/text-resource-element-definition'
import SqliteResourceElementDefinition from '@system/workspace/element-definition/resource/sqlite-resource-element-definition'
import type Resources from '@system/model/resource/resources'

namespace ResourcesElementDefinition {
  const getReservedNames = (
    children: readonly { element: unknown }[],
  ): string[] => children
    .map((child) => child.element as { kind?: unknown; id?: unknown })
    .filter((element) => (
      element.kind === 'directory-resource'
      || element.kind === 'text-resource'
      || element.kind === 'sqlite-resource'
    ))
    .map((element) => element.id)
    .filter((id): id is string => typeof id === 'string')

  export const definition = {
    kind: 'resources',
    treeLabel: { type: 'static', kindText: 'Resources', tone: 'manager' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = getReservedNames(context.node.children)
      return [
        action('Add directory', () => ElementDialog.openCreate(
          context.node.id,
          DirectoryResourceElementDefinition.createSchema({ reservedNames }),
        )),
        action('Add text file', () => ElementDialog.openCreate(
          context.node.id,
          TextResourceElementDefinition.createSchema({ reservedNames }),
        )),
        action('Add sqlite', () => ElementDialog.openCreate(
          context.node.id,
          SqliteResourceElementDefinition.createSchema({ reservedNames }),
        )),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Resources.Element>
}

export default ResourcesElementDefinition
