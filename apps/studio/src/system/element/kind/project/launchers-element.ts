import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import LauncherElement from './launcher-element'

namespace LaunchersElement {
  export type Kind = 'launchers'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'launchers',
  })

  export const definition = {
    kind: 'launchers',
    treeLabel: {
      type: 'static',
      kindText: 'Launchers',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children.map((n) => n.element).filter((e): e is LauncherElement.Element => e.kind === 'launcher').map((e) => e.id)
      return [action('Add launcher', () => ElementDialog.openCreate(context.node.id, LauncherElement.createSchema(context.rootNode, reservedNames)))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default LaunchersElement
