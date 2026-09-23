import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import Action from '@system/model/variable/action'

namespace ActionElementDefinition {
  export const createSchema = (): ElementEditSchema.Schema<Action.Element> => ({
    createTitle: 'Create Action', updateTitle: 'Update Action',
    fields: [
      { type: 'text', key: 'comment', label: 'Comment', width: 'id', maxLength: 64 },
      {
        type: 'script', key: 'source', label: 'Action', maxLength: 8000,
        allowAwaitInAsyncFunction: true,
      },
    ],
    createPreview: () => Action.create('...', ''),
    getInitialValues: (element) => ({ comment: element.comment, source: element.source }),
    create: (values) => Action.create(values.comment, values.source),
    update: (_element, values) => Action.create(values.comment, values.source),
  })
  export const definition = {
    kind: 'action',
    treeLabel: {
      type: 'static', kindText: 'Action', tone: 'item',
      getValueText: (element: Action.Element) => `/** ${element.comment} */`,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id, context.element, createSchema(),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [], canDisable: true, reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Action.Element>
}
export default ActionElementDefinition

