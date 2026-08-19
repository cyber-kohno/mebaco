import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TypeCatalog from '../type/type-catalog'
import FunctionArgumentElement from './function-argument-element'

namespace FunctionArgumentsElement {
  export type Kind = 'function-arguments'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'function-arguments',
  })

  export const definition = {
    kind: 'function-arguments',
    treeLabel: {
      type: 'static',
      kindText: 'Arguments',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children.flatMap((child) => (
        child.element.kind === 'function-argument' ? [child.element.id] : []
      ))
      return [
        action('Add argument', () => ElementDialog.openCreate(
          context.node.id,
          FunctionArgumentElement.createSchema({
            reservedNames,
            referenceOptions: TypeCatalog.getReferenceOptions(
              context.rootNode,
              context.node.id,
            ),
            namedTypeOptions: TypeCatalog.getNamedTypeOptions(
              context.rootNode,
              context.node.id,
            ),
          }),
        )),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default FunctionArgumentsElement
