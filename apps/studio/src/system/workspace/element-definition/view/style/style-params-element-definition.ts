import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import StyleParameterDeletion from './style-parameter-deletion'
import StyleParam from '@system/model/view/style/style-param'
import StyleParams from '@system/model/view/style/style-params'
import StyleParamElementDefinition from './style-param-element-definition'

namespace StyleParamsElementDefinition {
  export const definition = {
    kind: 'style-params',
    treeLabel: {
      type: 'static',
      kindText: 'Parameters',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children
        .map((node) => node.element)
        .filter((element): element is StyleParam.Element => element.kind === 'style-param')
        .map((element) => element.id)

      return [
        action('Add parameter', () => {
          ElementDialog.openCreate(
            context.node.id,
            StyleParamElementDefinition.createSchema({ reservedNames }),
          )
        }),
        action('Delete', () => {
          StyleParameterDeletion.request(
            context.rootNode,
            context.node,
            context.node.children.filter((node) => node.element.kind === 'style-param'),
            'Style Parameters',
          )
        }, 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<StyleParams.Element>
}

export default StyleParamsElementDefinition
