import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import TypeCatalog from '../type/type-catalog'
import ValueTypeDefinition from '../type/value-type-definition'
import FunctionArgumentsElement from './function-arguments-element'
import FunctionProcedureElement from './function-procedure-element'
import FunctionScope from './function-scope'
import FunctionTreeLabel from './FunctionTreeLabel.svelte'
import FunctionDefinition from './function-definition'

namespace FunctionElement {
  export type Kind = 'function'
  export type Mode = FunctionDefinition.Mode
  export type InlineElement = FunctionDefinition.Inline
  export type ReferElement = FunctionDefinition.Refer
  export type Element = FunctionDefinition.Element

  export const createInline = (
    id: string,
    async = false,
    returnType: ValueTypeDefinition.Definition | null = null,
  ): InlineElement => ({
    kind: 'function',
    id,
    mode: 'inline',
    async,
    returnType,
  })

  export const createRefer = (
    id: string,
    signatureTypeId = '',
  ): ReferElement => ({
    kind: 'function',
    id,
    mode: 'refer',
    signatureTypeId,
  })

  export type SchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
    lockedMode?: Mode
  }

  const parseReturnType = (
    values: Readonly<Record<string, string>>,
  ): ValueTypeDefinition.Definition | null => (
    values.voidReturn === 'true'
      ? null
      : ValueTypeDefinition.parse(values.returnType) ?? ValueTypeDefinition.create()
  )

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Function',
    updateTitle: 'Update Function',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'jsIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'select', key: 'mode', label: 'Mode', width: 'mode', required: true,
        readOnlyOnUpdate: options.lockedMode != null,
        defaultValue: options.lockedMode ?? 'inline',
        options: options.lockedMode == null
          ? [
              { value: 'inline', label: 'Inline' },
              { value: 'refer', label: 'Refer' },
            ]
          : [{
              value: options.lockedMode,
              label: options.lockedMode === 'inline' ? 'Inline' : 'Refer',
            }],
      },
      {
        type: 'checkbox', key: 'async', label: 'Async', defaultValue: 'false',
        visibleWhen: { key: 'mode', value: 'inline' },
      },
      {
        type: 'heading', key: 'returnTypeHeading', label: 'Return Type',
        visibleWhen: { key: 'mode', value: 'inline' },
      },
      {
        type: 'checkbox', key: 'voidReturn', label: 'Void',
        defaultValue: 'true',
        visibleWhen: { key: 'mode', value: 'inline' },
      },
      {
        type: 'valueType', key: 'returnType', label: 'Return Type', required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
        visibleWhenAll: [
          { key: 'mode', value: 'inline' },
          { key: 'voidReturn', value: 'false' },
        ],
      },
      {
        type: 'select', key: 'signatureTypeId', label: 'Signature',
        width: 'id', required: true,
        options: (options.namedTypeOptions ?? [])
          .filter((option) => option.kind === 'signature'),
        visibleWhen: { key: 'mode', value: 'refer' },
      },
    ],
    createPreview: () => createInline('...'),
    getInitialValues: (element) => ({
      id: element.id,
      mode: element.mode,
      async: String(element.mode === 'inline' && element.async),
      voidReturn: String(element.mode === 'inline' && element.returnType == null),
      returnType: ValueTypeDefinition.stringify(
        element.mode === 'inline' && element.returnType != null
          ? element.returnType
          : ValueTypeDefinition.create(),
      ),
      signatureTypeId: element.mode === 'refer' ? element.signatureTypeId : '',
    }),
    create: (values) => values.mode === 'refer'
      ? createRefer(values.id, values.signatureTypeId)
      : createInline(values.id, values.async === 'true', parseReturnType(values)),
    update: (element, values) => element.mode === 'refer'
      ? createRefer(values.id, values.signatureTypeId)
      : createInline(values.id, values.async === 'true', parseReturnType(values)),
  })

  export const resolveSignature = FunctionDefinition.resolveSignature
  export const getAsync = FunctionDefinition.getAsync
  export const getReturnType = FunctionDefinition.getReturnType

  export const definition = {
    kind: 'function',
    treeLabel: {
      type: 'component',
      Component: FunctionTreeLabel,
    },
    createInitialChildren: (element) => [
      ...(element.mode === 'inline'
        ? [{ element: FunctionArgumentsElement.create() }]
        : []),
      { element: FunctionProcedureElement.create() },
    ],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const frameNode = FunctionScope.findFrameNode(context.rootNode, context.node.id)
      const reservedNames = frameNode == null
        ? []
        : FunctionScope.collectFrameFunctions(frameNode)
            .filter((entry) => entry.node.id !== context.node.id)
            .map((entry) => entry.element.id)
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema({
            reservedNames,
            lockedMode: context.element.mode,
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
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default FunctionElement
