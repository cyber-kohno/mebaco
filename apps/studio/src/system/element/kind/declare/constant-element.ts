import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TypeExpression from '../type/type-expression'
import TypeCatalog from '../type/type-catalog'
import ValueTypeDefinition from '../type/value-type-definition'
import ConstantTreeLabel from './ConstantTreeLabel.svelte'
import ConstantScope from './constant-scope'
import TreeStore from '../../../store/tree-store'
import ElementDeletionController from '../../deletion/element-deletion-controller'

namespace ConstantElement {
  export type TypeSetting =
    | { type: 'inferred' }
    | { type: 'explicit'; valueType: TypeExpression.Expression; nullable: boolean }

  export type Kind = 'constant'
  export type Element = {
    kind: Kind
    id: string
    typeSetting: TypeSetting
    source: string
  }

  export const create = (
    id: string,
    typeSetting: TypeSetting,
    source: string,
  ): Element => ({ kind: 'constant', id, typeSetting, source })

  type SchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  const parseValueType = (
    values: Readonly<Record<string, string>>,
  ): ValueTypeDefinition.Definition => (
    ValueTypeDefinition.parse(values.valueType) ?? ValueTypeDefinition.create()
  )

  const createTypeSetting = (
    values: Readonly<Record<string, string>>,
  ): TypeSetting => values.explicitType !== 'true'
    ? { type: 'inferred' }
    : {
        type: 'explicit',
        valueType: parseValueType(values).valueType,
        nullable: parseValueType(values).nullable,
      }

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Constant',
    updateTitle: 'Update Constant',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'constantIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'checkbox', key: 'explicitType', label: 'Specify Value Type',
        defaultValue: 'false',
      },
      {
        type: 'valueType', key: 'valueType', label: 'Value Type', required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
        visibleWhen: { key: 'explicitType', value: 'true' },
      },
      {
        type: 'formula', key: 'source', label: 'Initial', required: true, maxLength: 4000,
        getExpectedTypeText: (values) => values.explicitType !== 'true'
          ? undefined
          : ValueTypeDefinition.getTypeText(
              parseValueType(values),
              (id) => TypeCatalog.toTypeScriptName(
                options.referenceOptions?.find((option) => option.value === id)?.label
                ?? options.namedTypeOptions?.find((option) => option.value === id)?.name
                ?? options.namedTypeOptions?.find((option) => option.value === id)?.label
                ?? 'MissingType',
              ),
            ),
      },
    ],
    createPreview: () => create('...', { type: 'inferred' }, '...'),
    getInitialValues: (element) => {
      const explicit = element.typeSetting.type === 'explicit'
        ? TypeExpression.unwrapArray(element.typeSetting.valueType)
        : null
      return {
        id: element.id,
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
    create: (values) => create(values.id, createTypeSetting(values), values.source),
    update: (_element, values) => create(values.id, createTypeSetting(values), values.source),
  })

  export const definition = {
    kind: 'constant',
    treeLabel: { type: 'component', Component: ConstantTreeLabel },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const options = {
        reservedNames: ConstantScope.getReservedNames(
          context.rootNode,
          context.parentNode?.id ?? context.node.id,
          context.node.id,
        ),
        referenceOptions: TypeCatalog.getReferenceOptions(context.rootNode, context.node.id),
        namedTypeOptions: TypeCatalog.getNamedTypeOptions(context.rootNode, context.node.id),
      }
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema(options),
        )),
        action('Delete', () => {
          void ElementDeletionController.requestDelete({
            rootNode: context.rootNode,
            node: context.node,
            policy: {
              label: `Constant '${context.element.id}'`,
              structuralReferences: 'ignore',
              expressionReferences: 'confirm',
            },
            deleteNode: () => TreeStore.removeNode(context.node.id),
          })
        }, 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default ConstantElement
