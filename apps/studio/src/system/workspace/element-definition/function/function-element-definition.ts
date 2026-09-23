import { get } from 'svelte/store'
import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import type TreeNode from '@system/model/tree/tree-node'
import TypeCatalog from '@system/model/type-system/type-catalog'
import SignatureDefinition from '@system/model/type-system/signature/signature-definition'
import ValueTypeDefinition from '@system/model/type-system/value-type-definition'
import FunctionProcedure from '@system/model/function/function-procedure'
import FunctionScope from '@system/model/function/function-scope'
import FunctionTreeLabel from '@system/workspace/tree/label/function/FunctionTreeLabel.svelte'
import FunctionDefinition from '@system/model/function/function-definition'
import FunctionDeletionPolicy from '@system/model/function/function-deletion-policy'
import FunctionDeletionRebindingPresentation from '@system/workspace/element-editor/presentation/function-deletion-rebinding-presentation'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'
import TreeStore from '@system/workspace/tree/state'
import { translate } from '@system/application/localization'

namespace FunctionElementDefinition {
  export type SignatureMode = FunctionDefinition.SignatureMode
  export type ImplementationMode = FunctionDefinition.ImplementationMode
  const createProcedureImplementation = (): FunctionDefinition.ProcedureImplementation => ({
    mode: 'procedure',
  })

  export type SchemaOptions = {
    reservedNames?: readonly string[]
    objectOptions?: readonly TypeCatalog.ObjectOption[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
    lockedSignatureMode?: SignatureMode
    initialSignatureMode?: SignatureMode
    lockedImplementationMode?: ImplementationMode
    initialImplementationMode?: ImplementationMode
    rootNode?: TreeNode.Node
  }

  const getDraftSignature = (
    values: Readonly<Record<string, string>>,
    options: SchemaOptions,
  ): SignatureDefinition.Definition | null => {
    if (values.signatureMode === 'inline') {
      return SignatureDefinition.parse(values.signatureDefinition ?? '')
    }
    if (options.rootNode == null) return null
    const signature = TypeCatalog.findSignature(
      options.rootNode,
      values.signatureTypeId ?? '',
    )?.element
    return signature == null
      ? null
      : {
          async: signature.async,
          parameters: signature.parameters,
          returnType: signature.returnType,
        }
  }

  const getExpectedTypeText = (
    values: Readonly<Record<string, string>>,
    options: SchemaOptions,
  ): string | undefined => {
    const definition = getDraftSignature(values, options)
    if (definition == null) return undefined
    if (definition.returnType == null) return 'void'
    return ValueTypeDefinition.getTypeText(
      definition.returnType,
      (typeId) => options.rootNode == null
        ? options.namedTypeOptions?.find((option) => option.value === typeId)?.label
        : TypeCatalog.resolveTypeScriptName(options.rootNode, typeId),
    )
  }

  const getFunctionParameters = (
    values: Readonly<Record<string, string>>,
    options: SchemaOptions,
  ): readonly { name: string; typeText: string }[] => {
    const signature = getDraftSignature(values, options)
    if (signature == null) return []
    return signature.parameters.map((parameter) => ({
      name: parameter.id,
      typeText: ValueTypeDefinition.getTypeText(
        { valueType: parameter.valueType, nullable: parameter.nullable },
        (typeId) => options.rootNode == null
          ? options.namedTypeOptions?.find((option) => option.value === typeId)?.label
          : TypeCatalog.resolveTypeScriptName(options.rootNode, typeId),
      ),
    }))
  }

  const createDetachedDefinition = (
    signatureTypeId: string,
    options: SchemaOptions,
  ): SignatureDefinition.Definition => {
    if (signatureTypeId.length === 0) return SignatureDefinition.create()
    if (options.rootNode == null) {
      throw new Error('Cannot detach a Signature without a Project tree.')
    }
    const source = TypeCatalog.findSignature(options.rootNode, signatureTypeId)?.element
    if (source == null) {
      throw new Error(`Cannot detach unavailable Signature '${signatureTypeId}'.`)
    }
    const clone = SignatureDefinition.parse(SignatureDefinition.stringify(source))
    if (clone == null) throw new Error(`Signature '${signatureTypeId}' is invalid.`)
    return {
      ...clone,
      parameters: clone.parameters.map((parameter) => ({
        ...parameter,
        parameterId: crypto.randomUUID(),
      })),
    }
  }

  const createImplementation = (
    values: Readonly<Record<string, string>>,
  ): FunctionDefinition.Implementation => values.implementationMode === 'code'
    ? { mode: 'code', source: values.source ?? '' }
    : createProcedureImplementation()

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<FunctionDefinition.Element> => ({
    createTitle: 'Create Function',
    updateTitle: 'Update Function',
    tabs: [
      { id: 'info', label: 'Info' },
      { id: 'signature', label: 'Signature' },
      { id: 'implementation', label: 'Implementation' },
    ],
    fields: [
      {
        type: 'text', tab: 'info', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'jsIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'select', tab: 'signature', key: 'signatureMode', label: 'Mode',
        width: 'mode', required: true,
        readOnlyOnUpdate: options.lockedSignatureMode != null,
        defaultValue: options.lockedSignatureMode ?? options.initialSignatureMode ?? 'inline',
        options: options.lockedSignatureMode == null
          ? [
              { value: 'inline', label: 'Inline' },
              { value: 'refer', label: 'Refer' },
            ]
          : [{
              value: options.lockedSignatureMode,
              label: options.lockedSignatureMode === 'inline' ? 'Inline' : 'Refer',
            }],
        onValueChange: (previousValue, nextValue, values) => {
          if (previousValue !== 'refer' || nextValue !== 'inline') return
          values.signatureDefinition = SignatureDefinition.stringify(
            createDetachedDefinition(values.signatureTypeId ?? '', options),
          )
        },
      },
      {
        type: 'signatureDefinition', tab: 'signature', key: 'signatureDefinition',
        label: 'Definition',
        defaultValue: SignatureDefinition.stringify(SignatureDefinition.create()),
        idKey: 'id',
        objectOptions: options.objectOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
        visibleWhen: { key: 'signatureMode', value: 'inline' },
      },
      {
        type: 'select', tab: 'signature', key: 'signatureTypeId', label: 'Signature',
        width: 'id', required: true, allowEmptyOption: true,
        options: (options.namedTypeOptions ?? []).filter((option) => option.kind === 'signature'),
        visibleWhen: { key: 'signatureMode', value: 'refer' },
      },
      {
        type: 'select', tab: 'implementation', key: 'implementationMode', label: 'Mode',
        width: 'mode', required: true,
        readOnlyOnUpdate: options.lockedImplementationMode != null,
        defaultValue: options.lockedImplementationMode ?? options.initialImplementationMode ?? 'procedure',
        options: options.lockedImplementationMode == null
          ? [
              { value: 'code', label: 'Code' },
              { value: 'procedure', label: 'Procedure' },
            ]
          : [{
              value: options.lockedImplementationMode,
              label: options.lockedImplementationMode === 'code' ? 'Code' : 'Procedure',
            }],
      },
      {
        type: 'description', tab: 'implementation', key: 'procedureDescription',
        label: translate('workspace.elementEditor.function.procedure.description'),
        visibleWhen: { key: 'implementationMode', value: 'procedure' },
      },
      {
        type: 'code', tab: 'implementation', key: 'source', label: 'Code',
        visibleWhen: { key: 'implementationMode', value: 'code' },
        getExpectedTypeText: (values) => getExpectedTypeText(values, options),
        getFunctionParameters: (values) => getFunctionParameters(values, options),
        getAllowAwait: (values) => getDraftSignature(values, options)?.async === true,
      },
    ],
    createPreview: () => FunctionDefinition.createInline('...'),
    getInitialValues: (element) => ({
      id: element.id,
      signatureMode: element.signature.mode,
      signatureDefinition: SignatureDefinition.stringify(
        element.signature.mode === 'inline'
          ? element.signature.definition
          : SignatureDefinition.create(),
      ),
      signatureTypeId: element.signature.mode === 'refer'
        ? element.signature.signatureTypeId
        : '',
      implementationMode: element.implementation.mode,
      source: element.implementation.mode === 'code' ? element.implementation.source : '',
    }),
    create: (values) => values.signatureMode === 'refer'
      ? FunctionDefinition.createRefer(values.id, values.signatureTypeId, createImplementation(values))
      : FunctionDefinition.createInline(
          values.id,
          SignatureDefinition.parse(values.signatureDefinition) ?? SignatureDefinition.create(),
          createImplementation(values),
        ),
    update: (_element, values) => values.signatureMode === 'refer'
      ? FunctionDefinition.createRefer(values.id, values.signatureTypeId, createImplementation(values))
      : FunctionDefinition.createInline(
          values.id,
          SignatureDefinition.parse(values.signatureDefinition) ?? SignatureDefinition.create(),
          createImplementation(values),
        ),
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
    createInitialChildren: (element) => element.implementation.mode === 'procedure'
      ? [{ element: FunctionProcedure.create() }]
      : [],
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
            lockedSignatureMode: context.element.signature.mode === 'inline' ? 'inline' : undefined,
            initialSignatureMode: context.element.signature.mode,
            lockedImplementationMode: context.element.implementation.mode,
            objectOptions: TypeCatalog.getObjectOptions(context.rootNode, context.node.id),
            namedTypeOptions: TypeCatalog.getNamedTypeOptions(context.rootNode, context.node.id),
            rootNode: context.rootNode,
          }),
        )),
        action('Delete', () => {
          const functionNode = context.node as TreeNode.Node & { element: FunctionDefinition.Element }
          void ElementDeletionController.requestDelete({
            rootNode: context.rootNode,
            node: functionNode,
            policy: {
              label: `Function '${context.element.id}'`,
              structuralReferences: 'ignore',
              expressionReferences: 'confirm',
            },
            expressionReferenceGuard: (references) => {
              const rebindings = FunctionDeletionPolicy.collectRebindings(
                context.rootNode,
                functionNode,
                references,
              )
              return rebindings.length === 0
                ? null
                : FunctionDeletionRebindingPresentation.create(
                    context.element.id,
                    rebindings,
                  )
            },
            deleteNode: () => TreeStore.removeNode(context.node.id),
            getRootNodeAfterDelete: () => get(TreeStore.rootNode),
          })
        }, 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<FunctionDefinition.Element>
}

export default FunctionElementDefinition
