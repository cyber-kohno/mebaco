import type ElementDefinition from '../../element-definition'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import StyleElement from '../view/style/style-element'
import StyleParameterCatalog from '../view/style/style-parameter-catalog'

namespace StylesElement {
  export type Kind = 'styles'

  export type Element = {
    kind: Kind
  }

  export const create = (): Element => ({
    kind: 'styles',
  })

  export const definition = {
    kind: 'styles',
    treeLabel: {
      type: 'static',
      kindText: 'Styles',
      tone: 'folder',
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.node.children
        .map((node) => node.element)
        .filter((element): element is StyleElement.Element => element.kind === 'style')
        .map((element) => element.id)

      return [
        action('Add Style', () => {
          ElementDialog.openCreate(
            context.node.id,
            StyleElement.createSchema({
              reservedNames,
              styleOptions: StyleElement.getStyleOptions(context.rootNode),
              styleCatalog: StyleParameterCatalog.createCatalog(context.rootNode),
            }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default StylesElement
