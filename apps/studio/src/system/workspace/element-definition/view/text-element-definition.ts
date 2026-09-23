import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TextTreeLabel from '@system/workspace/tree/label/view/TextTreeLabel.svelte'
import ResolvableValue from '@system/model/value/resolvable-value'
import TreeStore from '@system/workspace/tree/state'
import Text from '@system/model/view/text'

namespace TextElementDefinition {
  export const createSchema = (): ElementEditSchema.Schema<Text.Element> => ({
    createTitle: 'Create Text',
    updateTitle: 'Update Text',
    fields: [
      {
        type: 'textSource',
        key: 'source',
        label: 'Text',
        defaultValue: Text.stringifySource(ResolvableValue.createLiteral('')),
        maxLiteralLength: 200,
        maxFormulaLength: 4000,
      },
    ],
    createPreview: () => Text.createLiteral('...'),
    getInitialValues: (element) => ({
      source: Text.stringifySource(element.source),
    }),
    create: (values) => ({
      kind: 'text',
      source: Text.parseSource(values.source) ?? ResolvableValue.createLiteral(''),
    }),
    update: (element, values) => ({
      ...element,
      source: Text.parseSource(values.source) ?? element.source,
    }),
  })

  export const definition = {
    kind: 'text',
    treeLabel: {
      type: 'component',
      Component: TextTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema(),
          )
        }),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Text.Element>
}

export default TextElementDefinition
