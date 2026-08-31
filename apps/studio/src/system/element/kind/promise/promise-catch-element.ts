import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import FunctionActions from '../../function-actions'
import FunctionScope from '../function/function-scope'
import TreeStore from '../../../store/tree-store'

namespace PromiseCatchElement {
  export type Kind = 'promise-catch'
  export type Element = { kind: Kind; id: string }

  export const create = (id = 'error'): Element => ({ kind: 'promise-catch', id })

  export const createSchema = (
    reservedNames: readonly string[] = [],
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Promise Catch',
    updateTitle: 'Update Promise Catch',
    fields: [{
      type: 'text', key: 'id', label: 'Error Id', width: 'id', required: true,
      charset: 'jsIdentifier', minLength: 1, maxLength: 32, reservedNames,
    }],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({ id: element.id }),
    create: (values) => create(values.id),
    update: (_element, values) => create(values.id),
  })

  export const definition = {
    kind: 'promise-catch',
    treeLabel: {
      type: 'static', kindText: 'Catch', tone: 'condition',
      getValueText: (element: Element) => element.id,
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
  } satisfies ElementDefinition.Definition<Element>
}

export default PromiseCatchElement
