import type ElementDefinition from '../../../element-definition'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import StateElement from './state-element'
import TypeCatalog from '../../type/type-catalog'
import StateScope from './state-scope'

namespace StatesElement {
  export type Kind = 'states'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'states',
  })

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
        .filter((element): element is StateElement.Element => element.kind === 'state')
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
            StateElement.createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default StatesElement
