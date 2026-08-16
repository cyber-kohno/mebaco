import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import ElementDialog from '../../../element-dialog/element-dialog-controller'

namespace IfElement {
  export type Kind = 'if'

  export type Element = {
    kind: Kind
    condition: string
  }

  export const create = (condition = 'true'): Element => ({
    kind: 'if',
    condition,
  })

  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
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
    kind: 'if',
    treeLabel: {
      type: 'static',
      kindText: 'If',
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
      ]
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default IfElement
