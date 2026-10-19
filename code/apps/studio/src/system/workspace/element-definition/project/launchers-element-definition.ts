import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import Launcher from '@system/model/project/launcher'
import Launchers from '@system/model/project/launchers'
import LauncherElementDefinition from './launcher-element-definition'

namespace LaunchersElementDefinition {
  export const definition = {
    kind: 'launchers',
    treeLabel: {
      type: 'static',
      kindText: 'Launchers',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children.map((n) => n.element).filter((e): e is Launcher.Element => e.kind === 'launcher').map((e) => e.id)
      return [action('Add launcher', () => ElementDialog.openCreate(context.node.id, LauncherElementDefinition.createSchema(context.rootNode, reservedNames)))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Launchers.Element>
}

export default LaunchersElementDefinition
