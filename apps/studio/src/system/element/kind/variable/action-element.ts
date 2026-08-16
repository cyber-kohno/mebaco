import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'

namespace ActionElement {
  export type Kind = 'action'
  export type Element = { kind: Kind; comment: string; source: string }
  export const create = (comment: string, source: string): Element => ({
    kind: 'action', comment, source,
  })
  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Action', updateTitle: 'Update Action',
    fields: [
      { type: 'text', key: 'comment', label: 'Comment', width: 'id', maxLength: 64 },
      { type: 'script', key: 'source', label: 'Action', required: true, maxLength: 8000 },
    ],
    createPreview: () => create('...', ''),
    getInitialValues: (element) => ({ comment: element.comment, source: element.source }),
    create: (values) => create(values.comment, values.source),
    update: (_element, values) => create(values.comment, values.source),
  })
  export const definition = {
    kind: 'action',
    treeLabel: {
      type: 'static', kindText: 'Action', tone: 'item',
      getValueText: (element: Element) => `/** ${element.comment} */`,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [action('Modify', () => ElementDialog.openUpdate(
        context.node.id, context.element, createSchema(),
      ))]
    },
    childSlots: [], canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}
export default ActionElement
