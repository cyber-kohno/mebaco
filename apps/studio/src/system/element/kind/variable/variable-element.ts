import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TypeExpression from '../type/type-expression'
import TypeCatalog from '../type/type-catalog'
import VariableTreeLabel from './VariableTreeLabel.svelte'
import ValueTypeDefinition from '../type/value-type-definition'

namespace VariableElement {
  export type Kind = 'variable'

  export type TypeSetting =
    | { type: 'inferred' }
    | {
        type: 'explicit'
        valueType: TypeExpression.Expression
        nullable: boolean
      }

  export type Element = {
    kind: Kind
    id: string
    binding: 'const' | 'let'
    typeSetting: TypeSetting
    source: string
  }

  export const create = (
    id: string,
    binding: Element['binding'],
    typeSetting: TypeSetting,
    source: string,
  ): Element => ({ kind: 'variable', id, binding, typeSetting, source })

  export type SchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  const createTypeSetting = (
    values: Readonly<Record<string, string>>,
  ): TypeSetting => {
    if (values.explicitType !== 'true') return { type: 'inferred' }
    const definition = parseValueType(values)
    return {
      type: 'explicit',
      valueType: definition.valueType,
      nullable: definition.nullable,
    }
  }

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Variable',
    updateTitle: 'Update Variable',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'jsIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'checkbox', key: 'mutable', label: 'Mutable', defaultValue: 'false',
      },
      {
        type: 'checkbox', key: 'explicitType', label: 'Specify Value Type',
        defaultValue: 'false',
      },
      {
        type: 'valueType', key: 'valueType', label: 'Value Type',
        required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
        visibleWhen: { key: 'explicitType', value: 'true' },
      },
      {
        type: 'formula', key: 'source', label: 'Initial', required: true, maxLength: 4000,
        getExpectedTypeText: (values) => {
          if (values.explicitType !== 'true') return undefined
          const definition = parseValueType(values)
          return ValueTypeDefinition.getTypeText(
            definition,
            (id) => (
              options.referenceOptions?.find((option) => option.value === id)?.label
              ?? options.namedTypeOptions?.find((option) => option.value === id)?.name
              ?? options.namedTypeOptions?.find((option) => option.value === id)?.label
            ),
          )
        },
      },
    ],
    createPreview: () => create('...', 'const', { type: 'inferred' }, '...'),
    getInitialValues: (element) => {
      const explicit = element.typeSetting.type === 'explicit'
        ? TypeExpression.unwrapArray(element.typeSetting.valueType)
        : null
      return {
        id: element.id,
        mutable: String(element.binding === 'let'),
        explicitType: String(element.typeSetting.type === 'explicit'),
        valueType: ValueTypeDefinition.stringify(ValueTypeDefinition.create(
          explicit == null
            ? TypeExpression.createPrimitive()
            : TypeExpression.wrapArray(explicit.base, explicit.depth),
          element.typeSetting.type === 'explicit' && element.typeSetting.nullable,
        )),
        source: element.source,
      }
    },
    create: (values) => create(
      values.id,
      values.mutable === 'true' ? 'let' : 'const',
      createTypeSetting(values),
      values.source,
    ),
    update: (_element, values) => create(
      values.id,
      values.mutable === 'true' ? 'let' : 'const',
      createTypeSetting(values),
      values.source,
    ),
  })

  const parseValueType = (
    values: Readonly<Record<string, string>>,
  ): ValueTypeDefinition.Definition => (
    ValueTypeDefinition.parse(values.valueType) ?? ValueTypeDefinition.create()
  )

  export const definition = {
    kind: 'variable',
    treeLabel: { type: 'component', Component: VariableTreeLabel },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.parentNode?.children.flatMap((child) => (
        child.id !== context.node.id && child.element.kind === 'variable'
          ? [child.element.id]
          : []
      )) ?? []
      return [action('Modify', () => ElementDialog.openUpdate(
        context.node.id,
        context.element,
        createSchema({
          reservedNames,
          referenceOptions: TypeCatalog.getReferenceOptions(
            context.rootNode,
            context.node.id,
          ),
          namedTypeOptions: TypeCatalog.getNamedTypeOptions(
            context.rootNode,
            context.node.id,
          ),
        }),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default VariableElement
