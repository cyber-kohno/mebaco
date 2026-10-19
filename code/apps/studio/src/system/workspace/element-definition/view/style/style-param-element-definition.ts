import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import StyleParamTreeLabel from '@system/workspace/tree/label/view/style/StyleParamTreeLabel.svelte'
import StyleParameterDeletion from './style-parameter-deletion'
import StyleParam from '@system/model/view/style/style-param'

namespace StyleParamElementDefinition {
  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<StyleParam.Element> => ({
    createTitle: 'Create Style Parameter',
    updateTitle: 'Update Style Parameter',
    fields: [
      {
        type: 'text',
        key: 'id',
        label: 'Id',
        width: 'id',
        required: true,
        charset: 'jsIdentifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'select',
        key: 'valueType',
        label: 'Value Type',
        required: true,
        defaultValue: 'string',
        clearWhenChanged: ['hasDefaultValue', 'defaultValue'],
        options: StyleParam.valueTypes.map((valueType) => ({
          value: valueType,
          label: valueType,
        })),
      },
      {
        type: 'checkbox',
        key: 'hasDefaultValue',
        label: 'Use Default Value',
        defaultValue: 'false',
      },
      {
        type: 'literal',
        key: 'defaultValue',
        label: 'Default Value',
        valueTypeKey: 'valueType',
        enabledWhen: {
          key: 'hasDefaultValue',
          value: 'true',
        },
      },
    ],
    createPreview: () => StyleParam.create('...', 'string'),
    getInitialValues: (element) => ({
      id: element.id,
      valueType: element.valueType,
      hasDefaultValue: String(element.defaultValue !== undefined),
      defaultValue: element.defaultValue === undefined ? '' : String(element.defaultValue),
    }),
    create: (values) => StyleParam.create(
      values.id,
      values.valueType as StyleParam.ValueType,
      parseDefaultValue(values),
    ),
    update: (element, values) => ({
      ...element,
      id: values.id,
      valueType: values.valueType as StyleParam.ValueType,
      defaultValue: parseDefaultValue(values),
    }),
  })

  const parseDefaultValue = (
    values: Readonly<Record<string, string>>,
  ): StyleParam.Literal | undefined => {
    if (values.hasDefaultValue !== 'true') return undefined

    switch (values.valueType) {
      case 'number':
        return Number(values.defaultValue)
      case 'boolean':
        return values.defaultValue === 'true'
      case 'color':
      case 'string':
        return values.defaultValue
      default:
        return undefined
    }
  }

  export const definition = {
    kind: 'style-param',
    treeLabel: {
      type: 'component',
      Component: StyleParamTreeLabel,
    },
    search: { getIdText: (element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is StyleParam.Element => element.kind === 'style-param')
        .map((element) => element.id)

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames }),
          )
        }),
        action('Delete', () => {
          StyleParameterDeletion.request(
            context.rootNode,
            context.node,
            [context.node],
            `Style Parameter '${context.element.id}'`,
          )
        }, 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<StyleParam.Element>
}

export default StyleParamElementDefinition
