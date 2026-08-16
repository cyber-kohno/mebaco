import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import StyleParamElement from './style-param-element'

namespace StyleParamsElement {
  export type Kind = 'style-params'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'style-params',
  })

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
        .filter((element): element is StyleParamElement.Element => element.kind === 'style-param')
        .map((element) => element.id)

      return [
        action('Add parameter', () => {
          ElementDialog.openCreate(
            context.node.id,
            StyleParamElement.createSchema({ reservedNames }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default StyleParamsElement
