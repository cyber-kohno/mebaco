import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import ObjectTypeElementDefinition from '@system/workspace/element-definition/type-system/object/object-type-element-definition'
import TypeCatalog from '@system/model/type-system/type-catalog'
import UnionTypeElementDefinition from '@system/workspace/element-definition/type-system/union/union-type-element-definition'
import SignatureTypeElementDefinition from '@system/workspace/element-definition/type-system/signature/signature-type-element-definition'
import Types from '@system/model/declaration/types'

namespace TypesElementDefinition {
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
        action('Add object', () => {
          ElementDialog.openCreate(
            context.node.id,
            ObjectTypeElementDefinition.createSchema({ reservedNames, objectOptions }),
          )
        }),
        action('Add union', () => {
          ElementDialog.openCreate(
            context.node.id,
            UnionTypeElementDefinition.createSchema({ reservedNames, objectOptions }),
          )
        }),
        action('Add signature', () => {
          ElementDialog.openCreate(
            context.node.id,
            SignatureTypeElementDefinition.createSchema({
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
  } satisfies ElementDefinition.Definition<Types.Element>
}

export default TypesElementDefinition
