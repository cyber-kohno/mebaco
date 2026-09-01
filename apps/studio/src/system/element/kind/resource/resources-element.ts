import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import DirectoryResourceElement from './directory-resource-element'
import TextResourceElement from './text-resource-element'
import SqliteResourceElement from './sqlite-resource-element'

namespace ResourcesElement {
  export type Kind = 'resources'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'resources' })

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
          DirectoryResourceElement.createSchema({ reservedNames }),
        )),
        action('Add text file', () => ElementDialog.openCreate(
          context.node.id,
          TextResourceElement.createSchema({ reservedNames }),
        )),
        action('Add sqlite', () => ElementDialog.openCreate(
          context.node.id,
          SqliteResourceElement.createSchema({ reservedNames }),
        )),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ResourcesElement
