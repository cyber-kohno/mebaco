import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import TypeCatalog from '@system/model/type-system/type-catalog'
import TypeExpression from '@system/model/type-system/type-expression'
import ValueTypeDefinition from '@system/model/type-system/value-type-definition'
import FunctionScope from '@system/model/function/function-scope'
import PromiseModel from '@system/model/promise/promise'
import PromiseThen from '@system/model/promise/promise-then'
import PromiseCatch from '@system/model/promise/promise-catch'

namespace PromiseElementDefinition {
  export type SchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  const parseResultType = (
    values: Readonly<Record<string, string>>,
  ): ValueTypeDefinition.Definition | null => values.resultMode === 'void'
    ? null
    : ValueTypeDefinition.parse(values.valueType) ?? ValueTypeDefinition.create()

  const getTypeText = (
    definition: ValueTypeDefinition.Definition | null,
    options: SchemaOptions,
  ): string => definition == null
    ? 'void'
    : ValueTypeDefinition.getTypeText(definition, (id) => (
        TypeCatalog.toTypeScriptName(
          options.referenceOptions?.find((option) => option.value === id)?.label
          ?? options.namedTypeOptions?.find((option) => option.value === id)?.name
          ?? options.namedTypeOptions?.find((option) => option.value === id)?.label
          ?? 'MissingType',
        )
      ))

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<PromiseModel.Element> => ({
    createTitle: 'Create Promise',
    updateTitle: 'Update Promise',
    fields: [
      {
        type: 'select', key: 'resultMode', label: 'Result', width: 'mode',
        required: true, defaultValue: 'value',
        options: [
          { value: 'void', label: 'Void' },
          { value: 'value', label: 'Value' },
        ],
      },
      {
        type: 'text', key: 'id', label: 'Result Id', width: 'id', required: true,
        charset: 'jsIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
        visibleWhen: { key: 'resultMode', value: 'value' },
      },
      {
        type: 'valueType', key: 'valueType', label: 'Value Type', required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
        visibleWhen: { key: 'resultMode', value: 'value' },
      },
      {
        type: 'formula', key: 'source', label: 'Promise', required: true,
        maxLength: 4000,
        getExpectedTypeText: (values) => (
          `Promise<${getTypeText(parseResultType(values), options)}>`
        ),
      },
    ],
    createPreview: () => PromiseModel.create('...', ValueTypeDefinition.create(), '...'),
    getInitialValues: (element) => ({
      resultMode: element.resultType == null ? 'void' : 'value',
      id: element.id,
      valueType: ValueTypeDefinition.stringify(
        element.resultType ?? ValueTypeDefinition.create(),
      ),
      source: element.source,
    }),
    create: (values) => PromiseModel.create(
      values.resultMode === 'void' ? '' : values.id,
      parseResultType(values),
      values.source,
    ),
    update: (_element, values) => PromiseModel.create(
      values.resultMode === 'void' ? '' : values.id,
      parseResultType(values),
      values.source,
    ),
  })

  const getPreview = (source: string): string => {
    const singleLine = source.replace(/\s*\r?\n\s*/g, ' ')
    return singleLine.length > 40 ? `${singleLine.slice(0, 40)}...` : singleLine
  }

  const getReservedNames = (
    rootNode: Parameters<NonNullable<ElementDefinition.Definition<PromiseModel.Element>['getContextMenu']>>[0]['rootNode'],
    nodeId: number,
  ): string[] => {
    const frameNode = FunctionScope.findFrameNode(rootNode, nodeId)
    return frameNode == null
      ? []
      : FunctionScope.collectFrameVariables(frameNode)
          .filter((entry) => entry.node.id !== nodeId)
          .map((entry) => entry.element.id)
  }

  export const definition = {
    kind: 'promise',
    treeLabel: {
      type: 'static',
      kindText: 'Promise',
      tone: 'block',
      getValueText: (element: PromiseModel.Element) => {
        const result = element.resultType == null
          ? 'void'
          : `${element.id}: ${ValueTypeDefinition.getTypeText(element.resultType)}`
        return `${result} <- ${getPreview(element.source)}`
      },
    },
    createInitialChildren: () => [{ element: PromiseThen.create() }],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const catchNode = context.node.children.find(
        (child) => child.element.kind === 'promise-catch',
      )
      const catchAction = catchNode == null
        ? action('Use catch', () => TreeStore.addChild(
            context.node.id,
            PromiseCatch.create(),
          ))
        : action('Remove catch', () => TreeStore.removeNode(catchNode.id))
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema({
            reservedNames: getReservedNames(context.rootNode, context.node.id),
            referenceOptions: TypeCatalog.getReferenceOptions(
              context.rootNode,
              context.node.id,
            ),
            namedTypeOptions: TypeCatalog.getNamedTypeOptions(
              context.rootNode,
              context.node.id,
            ),
          }),
        )),
        catchAction,
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<PromiseModel.Element>
}

export default PromiseElementDefinition
