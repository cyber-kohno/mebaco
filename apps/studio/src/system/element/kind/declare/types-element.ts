import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import ObjectTypeElement from '../type/object-type-element'
import TypeCatalog from '../type/type-catalog'
import UnionTypeElement from '../type/union-type-element'
import SignatureTypeElement from '../type/signature-type-element'

namespace TypesElement {
  export type Kind = 'types'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({ kind: 'types' })

  export const definition = {
    kind: 'types',
    treeLabel: {
      type: 'static',
      kindText: 'Types',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = TypeCatalog.collectVisibleNamedTypes(
        context.rootNode,
        context.node.id,
      ).map((entry) => entry.element.id)
      const objectOptions = TypeCatalog.getObjectOptions(
        context.rootNode,
        context.node.id,
      )
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(
        context.rootNode,
        context.node.id,
      )

      return [
        action('Add Object', () => {
          ElementDialog.openCreate(
            context.node.id,
            ObjectTypeElement.createSchema({ reservedNames, objectOptions }),
          )
        }),
        action('Add Union', () => {
          ElementDialog.openCreate(
            context.node.id,
            UnionTypeElement.createSchema({ reservedNames, objectOptions }),
          )
        }),
        action('Add Signature', () => {
          ElementDialog.openCreate(
            context.node.id,
            SignatureTypeElement.createSchema({
              reservedNames,
              objectOptions,
              namedTypeOptions,
            }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default TypesElement
