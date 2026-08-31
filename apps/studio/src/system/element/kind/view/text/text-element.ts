import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import TextTreeLabel from './TextTreeLabel.svelte'

namespace TextElement {
  export type Kind = 'text'

  export type Source =
    | {
      type: 'plain'
      value: string
    }
    | {
      type: 'formula'
      value: string
    }

  export type Element = {
    kind: Kind
    source: Source
  }

  export const createPlain = (
    value: string,
  ): Element => ({
    kind: 'text',
    source: {
      type: 'plain',
      value,
    },
  })

  export const createFormula = (
    value: string,
  ): Element => ({
    kind: 'text',
    source: {
      type: 'formula',
      value,
    },
  })

  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Text',
    updateTitle: 'Update Text',
    fields: [
      {
        type: 'select',
        key: 'sourceType',
        label: 'Source',
        required: true,
        defaultValue: 'plain',
        options: [
          { value: 'plain', label: 'Plain text' },
          { value: 'formula', label: 'Formula' },
        ],
      },
      {
        type: 'text',
        key: 'plainValue',
        label: 'Text',
        charset: 'any',
        maxLength: 200,
        visibleWhen: {
          key: 'sourceType',
          value: 'plain',
        },
      },
      {
        type: 'formula',
        key: 'formulaValue',
        label: 'Formula',
        maxLength: 4000,
        visibleWhen: {
          key: 'sourceType',
          value: 'formula',
        },
      },
    ],
    createPreview: () => createPlain('...'),
    getInitialValues: (element) => ({
      sourceType: element.source.type,
      plainValue: element.source.type === 'plain' ? element.source.value : '',
      formulaValue: element.source.type === 'formula' ? element.source.value : '',
    }),
    create: (values) => (
      values.sourceType === 'formula'
        ? createFormula(values.formulaValue)
        : createPlain(values.plainValue)
    ),
    update: (_element, values) => (
      values.sourceType === 'formula'
        ? createFormula(values.formulaValue)
        : createPlain(values.plainValue)
    ),
  })

  export const definition = {
    kind: 'text',
    treeLabel: {
      type: 'component',
      Component: TextTreeLabel,
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
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default TextElement
