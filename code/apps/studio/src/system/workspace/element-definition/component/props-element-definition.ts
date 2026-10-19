import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TypeCatalog from '@system/model/type-system/type-catalog'
import Props from '@system/model/component/props'
import ValueProp from '@system/model/component/value-prop'
import ValuePropElementDefinition from './value-prop-element-definition'

namespace PropsElementDefinition {
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
        .filter((element): element is ValueProp.Element => element.kind === 'value-prop')
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
            ValuePropElementDefinition.createSchema({
              reservedNames,
              referenceOptions,
              namedTypeOptions,
            }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Props.Element>
}

export default PropsElementDefinition
