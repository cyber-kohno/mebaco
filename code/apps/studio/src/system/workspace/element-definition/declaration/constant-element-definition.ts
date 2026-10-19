import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TypeExpression from '@system/model/type-system/type-expression'
import TypeCatalog from '@system/model/type-system/type-catalog'
import ValueTypeDefinition from '@system/model/type-system/value-type-definition'
import ConstantTreeLabel from '@system/workspace/tree/label/declaration/ConstantTreeLabel.svelte'
import ConstantScope from '@system/model/declaration/constant-scope'
import Constant from '@system/model/declaration/constant'
import TreeStore from '@system/workspace/tree/state'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'

namespace ConstantElementDefinition {
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
  ): Constant.TypeSetting => values.explicitType !== 'true'
    ? { type: 'inferred' }
    : {
        type: 'explicit',
        valueType: parseValueType(values).valueType,
        nullable: parseValueType(values).nullable,
      }

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Constant.Element> => ({
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
    createPreview: () => Constant.create('...', { type: 'inferred' }, '...'),
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
    create: (values) => Constant.create(values.id, createTypeSetting(values), values.source),
    update: (_element, values) => Constant.create(values.id, createTypeSetting(values), values.source),
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
  } satisfies ElementDefinition.Definition<Constant.Element>
}

export default ConstantElementDefinition
