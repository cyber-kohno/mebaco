import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import ElseIfDirective from '@system/model/directive/else-if'

namespace ElseIfElementDefinition {
  export const createSchema = (): ElementEditSchema.Schema<ElseIfDirective.Element> => ({
    createTitle: 'Create Else If',
    updateTitle: 'Update Else If',
    fields: [
      {
        type: 'formula',
        key: 'condition',
        label: 'Condition',
        defaultValue: 'false',
        required: true,
        maxLength: 4000,
        getExpectedTypeText: () => 'boolean',
      },
    ],
    createPreview: () => ElseIfDirective.create(),
    getInitialValues: (element) => ({ condition: element.condition }),
    create: (values) => ElseIfDirective.create(values.condition),
    update: (element, values) => ({
      ...element,
      condition: values.condition,
    }),
  })

  const getPreview = (element: ElseIfDirective.Element): string => {
    const source = element.condition.replace(/\s*\r?\n\s*/g, ' ')
    return source.length > 32 ? `${source.slice(0, 32)}...` : source
  }

  export const definition = {
    kind: 'else-if',
    treeLabel: {
      type: 'static',
      kindText: 'Else If',
      tone: 'directive',
      getValueText: getPreview,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const isControlBranch = context.parentNode?.element.kind === 'control-conditional'
      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema(),
          )
        }),
        ...(isControlBranch
          ? [
              FunctionActions.createAddDeclareMenu(context.node.id, context.rootNode),
              FunctionActions.createAddStatementMenu(context.node.id, context.rootNode),
              FunctionActions.createAddControlMenu(context.node.id, context.rootNode),
              FunctionActions.createAddBlockItem(context.node.id),
            ]
          : ContentActions.createOptionalRetentionItems(context.node, context.rootNode)),
        action('Remove', () => {
          TreeStore.removeNode(context.node.id)
        }, 'danger'),
      ]
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'conditional-branch',
  } satisfies ElementDefinition.Definition<ElseIfDirective.Element>
}

export default ElseIfElementDefinition

