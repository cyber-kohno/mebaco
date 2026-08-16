import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import ValueSource from '../../../ui/input/value-source'
import TypeCatalog from '../type/type-catalog'
import TypeExpression from '../type/type-expression'
import ValuePropTreeLabel from './ValuePropTreeLabel.svelte'

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

  const createValueType = (
    values: Readonly<Record<string, string>>,
  ): TypeExpression.Expression => {
    const base = values.baseType === 'reference'
      ? TypeExpression.createReference([values.objectTypeId])
      : values.baseType === 'named'
        ? TypeExpression.createNamed(values.namedTypeId)
        : TypeExpression.createPrimitive(
            TypeExpression.primitiveTypes.includes(values.baseType as TypeExpression.PrimitiveName)
              ? values.baseType as TypeExpression.PrimitiveName
              : 'string',
          )
    return TypeExpression.wrapArray(base, Number(values.arrayDepth))
  }

  const isNullable = (
    values: Readonly<Record<string, string>>,
  ): boolean => (
    values.baseType === 'reference'
    && values.arrayDepth === '0'
    && values.nullable === 'true'
  )

  const createDefaultValue = (
    values: Readonly<Record<string, string>>,
  ): ValueSource.Value | undefined => {
    if (values.hasDefaultValue !== 'true') return undefined
    return ValueSource.parse(values.defaultValue) ?? ValueSource.createDefault()
  }

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
        width: 'id',
        required: true,
        charset: 'jsIdentifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'select',
        key: 'baseType',
        label: 'Value Type',
        width: 'valueType',
        required: true,
        defaultValue: 'string',
        clearWhenChanged: ['objectTypeId', 'namedTypeId', 'nullable'],
        options: [
          ...TypeExpression.primitiveTypes.map((type) => ({ value: type, label: type })),
          { value: 'reference', label: TypeExpression.getBaseTypeLabel('reference') },
          { value: 'named', label: TypeExpression.getBaseTypeLabel('named') },
        ],
      },
      {
        type: 'select',
        key: 'objectTypeId',
        label: 'Object',
        width: 'id',
        required: true,
        options: options.referenceOptions ?? [],
        visibleWhen: { key: 'baseType', value: 'reference' },
      },
      {
        type: 'select',
        key: 'namedTypeId',
        label: 'Union',
        width: 'id',
        required: true,
        options: options.namedTypeOptions ?? [],
        visibleWhen: { key: 'baseType', value: 'named' },
      },
      {
        type: 'number',
        key: 'arrayDepth',
        label: 'Array Depth',
        width: 'arrayDepth',
        defaultValue: '0',
        required: true,
        integer: true,
        min: 0,
        max: 9,
      },
      {
        type: 'checkbox',
        key: 'nullable',
        label: 'Nullable',
        defaultValue: 'false',
        visibleWhenAll: [
          { key: 'baseType', value: 'reference' },
          { key: 'arrayDepth', value: '0' },
        ],
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
        valueTypeKey: 'baseType',
        arrayDepthKey: 'arrayDepth',
        visibleWhen: { key: 'hasDefaultValue', value: 'true' },
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => {
      const { base, depth } = TypeExpression.unwrapArray(element.valueType)
      return {
        id: element.id,
        baseType: base.type,
        objectTypeId: base.type === 'reference' ? base.objectTypeIds[0] ?? '' : '',
        namedTypeId: base.type === 'named' ? base.namedTypeId : '',
        arrayDepth: String(depth),
        nullable: String(element.nullable),
        hasDefaultValue: String(element.defaultValue !== undefined),
        defaultValue: ValueSource.stringify(element.defaultValue ?? ValueSource.createDefault()),
      }
    },
    create: (values) => create(
      values.id,
      createValueType(values),
      isNullable(values),
      createDefaultValue(values),
    ),
    update: (element, values) => ({
      ...element,
      id: values.id,
      valueType: createValueType(values),
      nullable: isNullable(values),
      defaultValue: createDefaultValue(values),
    }),
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
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default ValuePropElement
