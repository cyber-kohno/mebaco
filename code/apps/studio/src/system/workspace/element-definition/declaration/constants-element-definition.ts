import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TypeCatalog from '@system/model/type-system/type-catalog'
import ConstantElementDefinition from './constant-element-definition'
import ConstantScope from '@system/model/declaration/constant-scope'
import Constants from '@system/model/declaration/constants'

namespace ConstantsElementDefinition {
  export const definition = {
    kind: 'constants',
    treeLabel: { type: 'static', kindText: 'Constants', tone: 'folder' },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        action('Add constant', () => ElementDialog.openCreate(
          context.node.id,
          ConstantElementDefinition.createSchema({
            reservedNames: ConstantScope.getReservedNames(context.rootNode, context.node.id),
            referenceOptions: TypeCatalog.getReferenceOptions(context.rootNode, context.node.id),
            namedTypeOptions: TypeCatalog.getNamedTypeOptions(context.rootNode, context.node.id),
          }),
        )),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Constants.Element>
}

export default ConstantsElementDefinition
