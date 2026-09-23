import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import type LaunchArgument from '@system/model/app/launch-argument'
import LaunchArgumentElementDefinition from '@system/workspace/element-definition/app/launch-argument-element-definition'
import TypeCatalog from '@system/model/type-system/type-catalog'
import type LaunchArguments from '@system/model/app/launch-arguments'

namespace LaunchArgumentsElementDefinition {
  export const definition = {
    kind: 'launch-arguments', treeLabel: { type: 'static', kindText: 'Arguments', tone: 'folder' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children.map((n) => n.element).filter((e): e is LaunchArgument.Element => e.kind === 'launch-argument').map((e) => e.id)
      return [action('Add argument', () => ElementDialog.openCreate(context.node.id, LaunchArgumentElementDefinition.createSchema({ reservedNames, referenceOptions: TypeCatalog.getReferenceOptions(context.rootNode, context.node.id), namedTypeOptions: TypeCatalog.getCommonNamedTypeOptions(context.rootNode) })))]
    }, childSlots: [], canDisable: false,
  } satisfies ElementDefinition.Definition<LaunchArguments.Element>
}
export default LaunchArgumentsElementDefinition
