import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'

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
      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema(),
          )
        }),
        ...ContentActions.createOptionalRetentionItems(
          context.node,
          context.rootNode,
        ),
        action('Remove', () => {
          TreeStore.removeNode(context.node.id)
        }, 'danger'),
      ]
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ElseIfElement
