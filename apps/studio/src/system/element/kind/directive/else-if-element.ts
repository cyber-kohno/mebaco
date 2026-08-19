import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import FunctionActions from '../../function-actions'

namespace ElseIfElement {
  export type Kind = 'else-if'

  export type Element = {
    kind: Kind
    condition: string
  }

  export const create = (condition = 'false'): Element => ({
    kind: 'else-if',
    condition,
  })

  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
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
    createPreview: () => create(),
    getInitialValues: (element) => ({ condition: element.condition }),
    create: (values) => create(values.condition),
    update: (element, values) => ({
      ...element,
      condition: values.condition,
    }),
  })

  const getPreview = (element: Element): string => {
    const source = element.condition.replace(/\s*\r?\n\s*/g, ' ')
    return source.length > 32 ? `${source.slice(0, 32)}...` : source
  }

  export const definition = {
    kind: 'else-if',
    treeLabel: {
      type: 'static',
      kindText: 'Else If',
      tone: 'condition',
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
  } satisfies ElementDefinition.Definition<Element>
}

export default ElseIfElement

