import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import StyleParamTreeLabel from './StyleParamTreeLabel.svelte'
import StyleParameterDeletion from './style-parameter-deletion'

namespace StyleParamElement {
  export type Kind = 'style-param'

  export const valueTypes = ['string', 'number', 'boolean', 'color'] as const
  export type ValueType = (typeof valueTypes)[number]
  export type Literal = string | number | boolean

  export type Element = {
    kind: Kind
    parameterId: string
    id: string
    valueType: ValueType
    defaultValue?: Literal
  }

  export const create = (
    id: string,
    valueType: ValueType,
    defaultValue?: Literal,
    parameterId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'style-param',
    parameterId,
    id,
    valueType,
    defaultValue,
  })

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
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
        options: valueTypes.map((valueType) => ({
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
    createPreview: () => create('...', 'string'),
    getInitialValues: (element) => ({
      id: element.id,
      valueType: element.valueType,
      hasDefaultValue: String(element.defaultValue !== undefined),
      defaultValue: element.defaultValue === undefined ? '' : String(element.defaultValue),
    }),
    create: (values) => create(
      values.id,
      values.valueType as ValueType,
      parseDefaultValue(values),
    ),
    update: (element, values) => ({
      ...element,
      id: values.id,
      valueType: values.valueType as ValueType,
      defaultValue: parseDefaultValue(values),
    }),
  })

  const parseDefaultValue = (
    values: Readonly<Record<string, string>>,
  ): Literal | undefined => {
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
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Element => element.kind === 'style-param')
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
  } satisfies ElementDefinition.Definition<Element>
}

export default StyleParamElement
