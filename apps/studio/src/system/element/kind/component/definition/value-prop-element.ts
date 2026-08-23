import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import ValueSource from '../../../../ui/input/value-source'
import TypeCatalog from '../../type/type-catalog'
import TypeExpression from '../../type/type-expression'
import ValueTypeDefinition from '../../type/value-type-definition'
import ValuePropTreeLabel from './ValuePropTreeLabel.svelte'
import TreeStore from '../../../../store/tree-store'

namespace ValuePropElement {
  export type Kind = 'value-prop'

  export type Element = {
    kind: Kind
    propId: string
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
    defaultValue?: ValueSource.Value
  }

  export const create = (
    id: string,
    valueType: TypeExpression.Expression = TypeExpression.createPrimitive(),
    nullable = false,
    defaultValue?: ValueSource.Value,
    propId = crypto.randomUUID(),
  ): Element => ({
    kind: 'value-prop',
    propId,
    id,
    valueType,
    nullable,
    defaultValue,
  })

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  const createDefaultValue = (
    values: Readonly<Record<string, string>>,
  ): ValueSource.Value | undefined => {
    if (values.hasDefaultValue !== 'true') return undefined
    return ValueSource.parse(values.defaultValue) ?? ValueSource.createDefault()
  }

  const parseValueType = (
    values: Readonly<Record<string, string>>,
  ): ValueTypeDefinition.Definition => (
    ValueTypeDefinition.parse(values.valueType) ?? ValueTypeDefinition.create()
  )

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Value Prop',
    updateTitle: 'Update Value Prop',
    fields: [
      {
        type: 'text',
        key: 'id',
        label: 'Id',
        readOnlyOnUpdate: true,
        width: 'id',
        required: true,
        charset: 'jsIdentifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'valueType',
        key: 'valueType',
        label: 'Value Type',
        readOnlyOnUpdate: true,
        required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
      },
      {
        type: 'checkbox',
        key: 'hasDefaultValue',
        label: 'Use Default Value',
        defaultValue: 'false',
      },
      {
        type: 'valueSource',
        key: 'defaultValue',
        label: 'Default Value',
        defaultValue: ValueSource.stringify(ValueSource.createDefault()),
        maxFormulaLength: 4000,
        valueTypeDefinitionKey: 'valueType',
        visibleWhen: { key: 'hasDefaultValue', value: 'true' },
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => {
      return {
        id: element.id,
        valueType: ValueTypeDefinition.stringify(
          ValueTypeDefinition.create(element.valueType, element.nullable),
        ),
        hasDefaultValue: String(element.defaultValue !== undefined),
        defaultValue: ValueSource.stringify(element.defaultValue ?? ValueSource.createDefault()),
      }
    },
    create: (values) => {
      const definition = parseValueType(values)
      return create(values.id, definition.valueType, definition.nullable, createDefaultValue(values))
    },
    update: (element, values) => {
      const definition = parseValueType(values)
      return {
        ...element,
        id: values.id,
        valueType: definition.valueType,
        nullable: definition.nullable,
        defaultValue: createDefaultValue(values),
      }
    },
  })

  export const definition = {
    kind: 'value-prop',
    treeLabel: {
      type: 'component',
      Component: ValuePropTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Element => element.kind === 'value-prop')
        .map((element) => element.id)
      const referenceOptions = TypeCatalog.getReferenceOptions(
        context.rootNode,
        context.node.id,
      )
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(
        context.rootNode,
        context.node.id,
      )

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
          )
        }),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default ValuePropElement
