import type ElementDefinition from '../../../element-definition'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import TypeCatalog from '../../type/type-catalog'
import ValuePropElement from './value-prop-element'

namespace PropsElement {
  export type Kind = 'props'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'props',
  })

  export const definition = {
    kind: 'props',
    treeLabel: {
      type: 'static',
      kindText: 'Props',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children
        .map((node) => node.element)
        .filter((element): element is ValuePropElement.Element => element.kind === 'value-prop')
        .map((element) => element.id)
      const referenceOptions = TypeCatalog.getReferenceOptions(
        context.rootNode,
        context.node.id,
      )
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(
        context.rootNode,
        context.node.id,
      )

      return [
        action('Add value prop', () => {
          ElementDialog.openCreate(
            context.node.id,
            ValuePropElement.createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default PropsElement
