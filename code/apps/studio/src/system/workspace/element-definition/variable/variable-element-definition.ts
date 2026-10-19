import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TypeExpression from '@system/model/type-system/type-expression'
import TypeCatalog from '@system/model/type-system/type-catalog'
import VariableTreeLabel from '@system/workspace/tree/label/variable/VariableTreeLabel.svelte'
import ValueTypeDefinition from '@system/model/type-system/value-type-definition'
import TreeStore from '@system/workspace/tree/state'
import FunctionScope from '@system/model/function/function-scope'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'
import StyleLocalScope from '@system/model/view/style/style-local-scope'
import Variable from '@system/model/variable/variable'

namespace VariableElementDefinition {
  export type SchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
    allowMutable?: boolean
  }

  const createTypeSetting = (
    values: Readonly<Record<string, string>>,
  ): Variable.TypeSetting => {
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
  ): ElementEditSchema.Schema<Variable.Element> => ({
    createTitle: 'Create Variable',
    updateTitle: 'Update Variable',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'jsIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
      },
      ...(options.allowMutable === false
        ? []
        : [{
            type: 'checkbox' as const,
            key: 'mutable',
            label: 'Mutable',
            defaultValue: 'false' as const,
          }]),
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
        allowAwaitInAsyncFunction: true,
        getExpectedTypeText: (values) => {
          if (values.explicitType !== 'true') return undefined
          const definition = parseValueType(values)
          return ValueTypeDefinition.getTypeText(
            definition,
            (id) => (
              TypeCatalog.toTypeScriptName(
                options.referenceOptions?.find((option) => option.value === id)?.label
                ?? options.namedTypeOptions?.find((option) => option.value === id)?.name
                ?? options.namedTypeOptions?.find((option) => option.value === id)?.label
                ?? 'MissingType',
              )
            ),
          )
        },
      },
    ],
    createPreview: () => Variable.create('...', 'const', { type: 'inferred' }, '...'),
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
    create: (values) => Variable.create(
      values.id,
      options.allowMutable !== false && values.mutable === 'true' ? 'let' : 'const',
      createTypeSetting(values),
      values.source,
    ),
    update: (_element, values) => Variable.create(
      values.id,
      options.allowMutable !== false && values.mutable === 'true' ? 'let' : 'const',
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
      const isStyleLocal = StyleLocalScope.isLocalVariable(
        context.rootNode,
        context.node.id,
      )
      const frameNode = FunctionScope.findFrameNode(context.rootNode, context.node.id)
      const reservedNames = frameNode == null
        ? context.parentNode?.children.flatMap((child) => (
            child.id !== context.node.id && child.element.kind === 'variable'
              ? [child.element.id]
              : []
          )) ?? []
        : FunctionScope.collectFrameVariables(frameNode)
            .filter((entry) => entry.node.id !== context.node.id)
            .map((entry) => entry.element.id)
      return [
        action('Modify', () => ElementDialog.openUpdate(
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
            allowMutable: !isStyleLocal,
          }),
        )),
        action('Delete', () => {
          void ElementDeletionController.requestDelete({
            rootNode: context.rootNode,
            node: context.node,
            policy: {
              label: `Variable '${context.element.id}'`,
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
  } satisfies ElementDefinition.Definition<Variable.Element>
}

export default VariableElementDefinition
