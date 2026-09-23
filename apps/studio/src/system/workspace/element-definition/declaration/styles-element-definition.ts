import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import StyleElement from '@system/workspace/element-definition/view/style/style-element-definition'
import StyleParameterCatalog from '@system/model/view/style/style-parameter-catalog'
import StyleReferencePreview from '@system/runtime/style/style-reference-preview'
import Styles from '@system/model/declaration/styles'
import Style from '@system/model/view/style/style'

namespace StylesElementDefinition {
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
        .filter((element): element is Style.Element => element.kind === 'style')
        .map((element) => element.id)

      return [
        action('Add style', () => {
          ElementDialog.openCreate(
            context.node.id,
            StyleElement.createSchema({
              reservedNames,
              styleOptions: StyleElement.getStyleOptions(context.rootNode),
              categoryOptions: StyleElement.getCategoryOptions(context.rootNode),
              styleCatalog: StyleParameterCatalog.createCatalog(context.rootNode),
              getStylePreview: StyleReferencePreview.createResolver(context.rootNode),
            }),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Styles.Element>
}

export default StylesElementDefinition
