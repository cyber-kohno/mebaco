import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import IfDirective from '@system/model/directive/if'

namespace IfElementDefinition {
  export const createSchema = (): ElementEditSchema.Schema<IfDirective.Element> => ({
    createTitle: 'Create If',
    updateTitle: 'Update If',
    fields: [
      {
        type: 'formula',
        key: 'condition',
        label: 'Condition',
        defaultValue: 'true',
        required: true,
        maxLength: 4000,
        getExpectedTypeText: () => 'boolean',
      },
    ],
    createPreview: () => IfDirective.create(),
    getInitialValues: (element) => ({ condition: element.condition }),
    create: (values) => IfDirective.create(values.condition),
    update: (element, values) => ({
      ...element,
      condition: values.condition,
    }),
  })

  const getPreview = (element: IfDirective.Element): string => {
    const source = element.condition.replace(/\s*\r?\n\s*/g, ' ')
    return source.length > 32 ? `${source.slice(0, 32)}...` : source
  }

  export const definition = {
    kind: 'if',
    treeLabel: {
      type: 'static',
      kindText: 'If',
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
      ]
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: true,
  } satisfies ElementDefinition.Definition<IfDirective.Element>
}

export default IfElementDefinition

