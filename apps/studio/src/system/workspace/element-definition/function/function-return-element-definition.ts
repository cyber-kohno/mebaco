import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import FunctionScope from '@system/model/function/function-scope'
import FunctionDefinition from '@system/model/function/function-definition'
import FunctionReturn from '@system/model/function/function-return'

namespace FunctionReturnElementDefinition {
  export type SchemaOptions = {
    expectedTypeText?: string
    required?: boolean
  }

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<FunctionReturn.Element> => ({
    createTitle: 'Create Return',
    updateTitle: 'Update Return',
    fields: [
      {
        type: 'formula', key: 'source', label: 'Return', maxLength: 4000,
        required: options.required,
        getExpectedTypeText: () => options.expectedTypeText,
        allowAwaitInAsyncFunction: true,
      },
    ],
    createPreview: () => FunctionReturn.create(''),
    getInitialValues: (element) => ({ source: element.source ?? '' }),
    create: (values) => FunctionReturn.create(values.source.length > 0 ? values.source : undefined),
    update: (_element, values) => FunctionReturn.create(values.source.length > 0 ? values.source : undefined),
  })

  export const definition = {
    kind: 'function-return',
    treeLabel: {
      type: 'static',
      kindText: 'Return',
      tone: 'item',
      getValueText: (element: FunctionReturn.Element) => element.source || undefined,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const owner = FunctionScope.findOwnerFunction(context.rootNode, context.node.id)
      return [
        ...(owner == null || FunctionDefinition.getReturnType(context.rootNode, owner.element) == null
          ? []
          : [action('Modify', () => ElementDialog.openUpdate(
              context.node.id,
              context.element,
              FunctionActions.createReturnSchema(context.rootNode, context.node.id),
            ))]),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<FunctionReturn.Element>
}

export default FunctionReturnElementDefinition
