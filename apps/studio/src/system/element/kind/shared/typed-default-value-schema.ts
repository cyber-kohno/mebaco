import type MebacoElement from '../../element'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ValueSource from '../../../ui/input/value-source'
import type TypeCatalog from '../type/type-catalog'
import TypeExpression from '../type/type-expression'
import ValueTypeDefinition from '../type/value-type-definition'
import TypeDefaultLabel from '../type/type-default-label'

namespace TypedDefaultValueSchema {
  export type ElementValues = {
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
    defaultValue?: ValueSource.Value
  }

  export type Element = MebacoElement.Element & ElementValues

  export type Options = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  export type Adapter<TElement extends Element> = {
    createTitle: string
    updateTitle: string
    createPreview: () => TElement
    createElement: (values: ElementValues) => TElement
  }

  const parseValueType = (
    values: Readonly<Record<string, string>>,
  ): ValueTypeDefinition.Definition => (
    ValueTypeDefinition.parse(values.valueType) ?? ValueTypeDefinition.create()
  )

  const parseDefaultValue = (
    values: Readonly<Record<string, string>>,
  ): ValueSource.Value | undefined => {
    if (values.hasDefaultValue !== 'true') return undefined
    const source = ValueSource.parse(values.defaultValue)
    return source?.type === 'literal' || source?.type === 'default'
      ? source
      : undefined
  }

  const parseElementValues = (
    values: Readonly<Record<string, string>>,
  ): ElementValues => {
    const definition = parseValueType(values)
    return {
      id: values.id,
      valueType: definition.valueType,
      nullable: definition.nullable,
      defaultValue: parseDefaultValue(values),
    }
  }

  export const create = <TElement extends Element>(
    adapter: Adapter<TElement>,
    options: Options = {},
  ): ElementEditSchema.Schema<TElement> => ({
    createTitle: adapter.createTitle,
    updateTitle: adapter.updateTitle,
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
        readOnlyOnUpdate: true,
      },
      {
        type: 'valueType',
        key: 'valueType',
        label: 'Value Type',
        required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
        resetWhenChanged: ['hasDefaultValue', 'defaultValue'],
      },
      {
        type: 'checkbox',
        key: 'hasDefaultValue',
        label: 'Use Default Value',
        defaultValue: 'false',
        enabledWhenValid: 'valueType',
      },
      {
        type: 'valueSource',
        key: 'defaultValue',
        label: 'Default Value',
        defaultValue: ValueSource.stringify(ValueSource.createDefault()),
        valueTypeDefinitionKey: 'valueType',
        literalOnly: true,
        getLiteralOptions: (values) => {
          const definition = ValueTypeDefinition.parse(values.valueType)
          const base = definition == null
            ? null
            : TypeExpression.unwrapArray(definition.valueType).base
          if (base?.type !== 'named') return []
          const option = options.namedTypeOptions?.find(
            (candidate) => candidate.value === base.namedTypeId,
          )
          return option?.literalValues?.map((value) => ({
            value: String(value),
            label: String(value),
          })) ?? []
        },
        getTypeDefaultLabel: (values) => {
          const definition = ValueTypeDefinition.parse(values.valueType)
          return definition == null
            ? undefined
            : TypeDefaultLabel.getFromOptions(
                definition,
                options.referenceOptions ?? [],
                options.namedTypeOptions ?? [],
              )
        },
        visibleWhen: { key: 'hasDefaultValue', value: 'true' },
      },
    ],
    createPreview: adapter.createPreview,
    getInitialValues: (element) => ({
      id: element.id,
      valueType: ValueTypeDefinition.stringify(
        ValueTypeDefinition.create(element.valueType, element.nullable),
      ),
      hasDefaultValue: String(element.defaultValue !== undefined),
      defaultValue: ValueSource.stringify(element.defaultValue ?? ValueSource.createDefault()),
    }),
    create: (values) => adapter.createElement(parseElementValues(values)),
    update: (element, values) => ({
      ...element,
      ...parseElementValues(values),
    }),
  })
}

export default TypedDefaultValueSchema
