import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import FunctionScope from '@system/model/function/function-scope'
import TreeStore from '@system/workspace/tree/state'
import PromiseCatch from '@system/model/promise/promise-catch'

namespace PromiseCatchElementDefinition {
  export const createSchema = (
    reservedNames: readonly string[] = [],
  ): ElementEditSchema.Schema<PromiseCatch.Element> => ({
    createTitle: 'Create Promise Catch',
    updateTitle: 'Update Promise Catch',
    fields: [{
      type: 'text', key: 'id', label: 'Error Id', width: 'id', required: true,
      charset: 'jsIdentifier', minLength: 1, maxLength: 32, reservedNames,
    }],
    createPreview: () => PromiseCatch.create('...'),
    getInitialValues: (element) => ({ id: element.id }),
    create: (values) => PromiseCatch.create(values.id),
    update: (_element, values) => PromiseCatch.create(values.id),
  })

  export const definition = {
    kind: 'promise-catch',
    treeLabel: {
      type: 'static', kindText: 'Catch', tone: 'condition',
      getValueText: (element: PromiseCatch.Element) => element.id,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const frameNode = FunctionScope.findFrameNode(context.rootNode, context.node.id)
      const reservedNames = frameNode == null
        ? []
        : FunctionScope.collectFrameVariables(frameNode)
            .filter((entry) => entry.node.id !== context.node.id)
            .map((entry) => entry.element.id)
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema(reservedNames),
        )),
        FunctionActions.createAddDeclareMenu(context.node.id, context.rootNode),
        FunctionActions.createAddStatementMenu(
          context.node.id,
          context.rootNode,
          undefined,
          false,
        ),
        FunctionActions.createAddControlMenu(context.node.id, context.rootNode),
        FunctionActions.createAddBlockItem(context.node.id),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<PromiseCatch.Element>
}

export default PromiseCatchElementDefinition
