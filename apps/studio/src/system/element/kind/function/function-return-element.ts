import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import FunctionActions from '../../function-actions'
import FunctionScope from './function-scope'
import FunctionElement from './function-element'

namespace FunctionReturnElement {
  export type Kind = 'function-return'

  export type Element = {
    kind: Kind
    source?: string
  }

  export const create = (source?: string): Element => source == null
    ? { kind: 'function-return' }
    : { kind: 'function-return', source }

  export type SchemaOptions = {
    expectedTypeText?: string
    required?: boolean
  }

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
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
    createPreview: () => create(''),
    getInitialValues: (element) => ({ source: element.source ?? '' }),
    create: (values) => create(values.source.length > 0 ? values.source : undefined),
    update: (_element, values) => create(values.source.length > 0 ? values.source : undefined),
  })

  export const definition = {
    kind: 'function-return',
    treeLabel: {
      type: 'static',
      kindText: 'Return',
      tone: 'item',
      getValueText: (element: Element) => element.source || undefined,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const owner = FunctionScope.findOwnerFunction(context.rootNode, context.node.id)
      return [
        ...(owner == null || FunctionElement.getReturnType(context.rootNode, owner.element) == null
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
  } satisfies ElementDefinition.Definition<Element>
}

export default FunctionReturnElement
