import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TypeExpression from '../type/type-expression'
import ValueTypeDefinition from '../type/value-type-definition'
import TypeCatalog from '../type/type-catalog'
import LaunchArgumentTreeLabel from './LaunchArgumentTreeLabel.svelte'
import TreeStore from '../../../store/tree-store'
import ValueSource from '../../../ui/input/value-source'

namespace LaunchArgumentElement {
  export type Kind = 'launch-argument'
  export type Element = {
    kind: Kind
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
    defaultValue?: ValueSource.Value
  }
  export const create = (id = '...'): Element => ({ kind: 'launch-argument', id, valueType: TypeExpression.createPrimitive(), nullable: false })
  export type CreateSchemaOptions = { reservedNames?: readonly string[]; referenceOptions?: readonly TypeCatalog.Option[]; namedTypeOptions?: readonly TypeCatalog.Option[] }
  const createDefaultValue = (
    values: Readonly<Record<string, string>>,
  ): ValueSource.Value | undefined => {
    if (values.hasDefaultValue !== 'true') return undefined
    const source = ValueSource.parse(values.defaultValue)
    return source?.type === 'literal' || source?.type === 'default'
      ? source
      : undefined
  }

  export const createSchema = (options: CreateSchemaOptions = {}): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Launch Argument', updateTitle: 'Update Launch Argument',
    fields: [
      { type: 'text', key: 'id', label: 'Id', width: 'id', required: true, readOnlyOnUpdate: true, charset: 'jsIdentifier', minLength: 1, maxLength: 32, reservedNames: options.reservedNames },
      { type: 'valueType', key: 'valueType', label: 'Value Type', required: true, readOnlyOnUpdate: true, defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()), objectOptions: options.referenceOptions ?? [], namedTypeOptions: options.namedTypeOptions ?? [] },
      { type: 'checkbox', key: 'hasDefaultValue', label: 'Use Default Value', defaultValue: 'false' },
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
          const option = options.namedTypeOptions?.find((candidate) => candidate.value === base.namedTypeId)
          return option?.literalValues?.map((value) => ({
            value: String(value),
            label: String(value),
          })) ?? []
        },
        visibleWhen: { key: 'hasDefaultValue', value: 'true' },
      },
    ],
    createPreview: () => create(),
    getInitialValues: (e) => ({
      id: e.id,
      valueType: ValueTypeDefinition.stringify(ValueTypeDefinition.create(e.valueType, e.nullable)),
      hasDefaultValue: String(e.defaultValue != null),
      defaultValue: ValueSource.stringify(e.defaultValue ?? ValueSource.createDefault()),
    }),
    create: (v) => {
      const d = ValueTypeDefinition.parse(v.valueType) ?? ValueTypeDefinition.create()
      return {
        kind: 'launch-argument',
        id: v.id,
        valueType: d.valueType,
        nullable: d.nullable,
        defaultValue: createDefaultValue(v),
      }
    },
    update: (e, v) => {
      const d = ValueTypeDefinition.parse(v.valueType) ?? ValueTypeDefinition.create()
      return {
        ...e,
        id: v.id,
        valueType: d.valueType,
        nullable: d.nullable,
        defaultValue: createDefaultValue(v),
      }
    },
  })
  export const definition = {
    kind: 'launch-argument',
    treeLabel: { type: 'component', Component: LaunchArgumentTreeLabel },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.parentNode?.children
        .filter((n) => n.id !== context.node.id)
        .map((n) => n.element)
        .filter((e): e is Element => e.kind === 'launch-argument')
        .map((e) => e.id) ?? []
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema({
            reservedNames,
            referenceOptions: TypeCatalog.getReferenceOptions(context.rootNode, context.node.id),
            namedTypeOptions: TypeCatalog.getCommonNamedTypeOptions(context.rootNode),
          }),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}
export default LaunchArgumentElement
