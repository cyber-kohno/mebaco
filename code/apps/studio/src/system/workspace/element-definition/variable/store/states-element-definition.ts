import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import StateElementDefinition from './state-element-definition'
import TypeCatalog from '@system/model/type-system/type-catalog'
import StateScope from '@system/model/variable/state-scope'
import State from '@system/model/variable/state'
import States from '@system/model/variable/states'

namespace StatesElementDefinition {
  export const definition = {
    kind: 'states',
    treeLabel: {
      type: 'static',
      kindText: 'States',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = [
        ...context.node.children
        .map((node) => node.element)
        .filter((element): element is State.Element => element.kind === 'state')
        .map((element) => element.id),
        ...StateScope.getAncestorStateIds(context.rootNode, context.node.id),
      ]
      const referenceOptions = TypeCatalog.getReferenceOptions(
        context.rootNode,
        context.node.id,
      )
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(
        context.rootNode,
        context.node.id,
      )

      return [
        action('Add state', () => {
          ElementDialog.openCreate(
            context.node.id,
            StateElementDefinition.createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<States.Element>
}

export default StatesElementDefinition
