import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { elementDialogStore } from '../../../element-dialog/element-dialog-store'
import FunctionElement from './function-element'
import FunctionProcedureElement from './function-procedure-element'
import FunctionReturnElement from './function-return-element'
import SignatureDefinition from '../type/signature/signature-definition'
import TypeExpression from '../type/type-expression'
import ValueTypeDefinition from '../type/value-type-definition'
import type TreeNode from '../../../tree/tree-node'
import BlockElement from '../block/block-element'
import VariableElement from '../variable/variable-element'

vi.mock('../../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))

const createTree = (withReturn = false) => {
  const procedure: TreeNode.Node & {
    element: FunctionProcedureElement.Element
  } = {
    id: 4,
    element: FunctionProcedureElement.create(),
    isOpen: true,
    children: withReturn
      ? [{ id: 5, element: FunctionReturnElement.create('1'), isOpen: true, children: [] }]
      : [],
  }
  const owner: TreeNode.Node = {
    id: 2,
    element: FunctionElement.createInline('calculate'),
    isOpen: true,
    children: [procedure],
  }
  const root: TreeNode.Node = {
    id: 1,
    element: { kind: 'project' },
    isOpen: true,
    children: [owner],
  }
  return { root, owner, procedure }
}

afterEach(() => elementDialogStore.set(null))

describe('Function editing UI models', () => {
  it('uses Info, Signature and Implementation tabs', () => {
    const schema = FunctionElement.createSchema()
    expect(schema.tabs).toEqual([
      { id: 'info', label: 'Info' },
      { id: 'signature', label: 'Signature' },
      { id: 'implementation', label: 'Implementation' },
    ])
    expect(schema.fields.find((field) => field.key === 'id')).toMatchObject({ tab: 'info' })
    expect(schema.fields.find((field) => field.key === 'signatureMode'))
      .toMatchObject({ tab: 'signature', defaultValue: 'inline' })
    expect(schema.fields.find((field) => field.key === 'implementationMode'))
      .toMatchObject({ tab: 'implementation', defaultValue: 'procedure' })
  })

  it('round-trips an owned Signature and Code implementation', () => {
    const schema = FunctionElement.createSchema()
    const definition = SignatureDefinition.create(
      true,
      [SignatureDefinition.createParameter(
        'count',
        TypeExpression.createPrimitive('number'),
        false,
        'count-id',
      )],
      ValueTypeDefinition.create(TypeExpression.createPrimitive('number'), false),
    )
    const element = schema.create({
      id: 'loadCount',
      signatureMode: 'inline',
      signatureDefinition: SignatureDefinition.stringify(definition),
      signatureTypeId: '',
      implementationMode: 'code',
      source: 'return await load(count)',
    })

    expect(element).toEqual(FunctionElement.createInline(
      'loadCount',
      definition,
      { mode: 'code', source: 'return await load(count)' },
    ))
    expect(schema.getInitialValues(element)).toMatchObject({
      signatureMode: 'inline',
      signatureDefinition: SignatureDefinition.stringify(definition),
      implementationMode: 'code',
      source: 'return await load(count)',
    })
  })

  it('injects draft Inline parameters and return type into the Code editor', () => {
    const root: TreeNode.Node = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    }
    const schema = FunctionElement.createSchema({ rootNode: root })
    const definition = SignatureDefinition.create(
      true,
      [SignatureDefinition.createParameter(
        'count',
        TypeExpression.createPrimitive('number'),
        false,
        'count-id',
      )],
      ValueTypeDefinition.create(TypeExpression.createPrimitive('number'), false),
    )
    const values = {
      signatureMode: 'inline',
      signatureDefinition: SignatureDefinition.stringify(definition),
      signatureTypeId: '',
      implementationMode: 'code',
    }
    const field = schema.fields.find((candidate) => candidate.key === 'source')
    expect(field?.type).toBe('code')
    if (field?.type !== 'code') return

    expect(field.getFunctionParameters(values)).toEqual([
      { name: 'count', typeText: 'number' },
    ])
    expect(field.getExpectedTypeText(values)).toBe('number')
    expect(field.getAllowAwait(values)).toBe(true)
  })

  it('creates Refer Functions, detaches a selected Signature, and keeps Implementation locked', () => {
    const option = {
      value: 'save-signature', label: 'SaveHandler', kind: 'signature' as const,
      preview: '(payload: string) => void',
    }
    const createSchema = FunctionElement.createSchema({ namedTypeOptions: [option] })
    expect(createSchema.create({
      id: 'save',
      signatureMode: 'refer',
      signatureDefinition: SignatureDefinition.stringify(SignatureDefinition.create()),
      signatureTypeId: option.value,
      implementationMode: 'procedure',
      source: '',
    })).toEqual(FunctionElement.createRefer('save', option.value))

    const signatureNode: TreeNode.Node = {
      id: 2,
      element: {
        kind: 'signature-type', typeId: option.value, id: 'SaveHandler',
        async: false,
        parameters: [SignatureDefinition.createParameter(
          'payload',
          TypeExpression.createPrimitive('string'),
          false,
          'source-parameter-id',
        )],
        returnType: null,
      },
      isOpen: true,
      children: [],
    }
    const root: TreeNode.Node = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [signatureNode],
    }
    const updateSchema = FunctionElement.createSchema({
      namedTypeOptions: [option],
      initialSignatureMode: 'refer',
      lockedImplementationMode: 'procedure',
      rootNode: root,
    })
    const signatureModeField = updateSchema.fields.find((field) => field.key === 'signatureMode')
    expect(updateSchema.fields.find((field) => field.key === 'signatureTypeId')).toMatchObject({
      required: true,
      allowEmptyOption: true,
    })
    expect(signatureModeField).toMatchObject({
      options: [
        { value: 'inline', label: 'Inline' },
        { value: 'refer', label: 'Refer' },
      ],
    })
    if (signatureModeField?.type !== 'select') return
    const values = {
      signatureMode: 'inline',
      signatureTypeId: option.value,
      signatureDefinition: '',
    }
    signatureModeField.onValueChange?.('refer', 'inline', values)
    const detached = SignatureDefinition.parse(values.signatureDefinition)
    expect(detached).toMatchObject({
      async: false,
      parameters: [{ id: 'payload', valueType: { type: 'string' } }],
      returnType: null,
    })
    expect(detached?.parameters[0].parameterId).not.toBe('source-parameter-id')
    expect(updateSchema.fields.find((field) => field.key === 'implementationMode')).toMatchObject({
      readOnlyOnUpdate: true,
      options: [{ value: 'procedure', label: 'Procedure' }],
    })

    const codeField = updateSchema.fields.find((field) => field.key === 'source')
    expect(codeField?.type).toBe('code')
    if (codeField?.type !== 'code') return
    expect(codeField.getFunctionParameters({
      signatureMode: 'refer',
      signatureTypeId: option.value,
    })).toEqual([{ name: 'payload', typeText: 'string' }])
  })

  it('creates an empty Inline Signature when Refer is detached without a selection', () => {
    const schema = FunctionElement.createSchema()
    const field = schema.fields.find((candidate) => candidate.key === 'signatureMode')
    if (field?.type !== 'select') return
    const values = {
      signatureMode: 'inline',
      signatureTypeId: '',
      signatureDefinition: '',
    }
    field.onValueChange?.('refer', 'inline', values)
    expect(SignatureDefinition.parse(values.signatureDefinition))
      .toEqual(SignatureDefinition.create())
  })

  it('copies a selected Refer Signature when switching to Inline', () => {
    const signatureNode: TreeNode.Node = {
      id: 2,
      element: {
        kind: 'signature-type', typeId: 'source-signature', id: 'SourceSignature',
        async: true,
        parameters: [SignatureDefinition.createParameter(
          'value',
          TypeExpression.createPrimitive('number'),
          false,
          'source-parameter-id',
        )],
        returnType: ValueTypeDefinition.create(
          TypeExpression.createPrimitive('string'),
          false,
        ),
      },
      isOpen: true,
      children: [],
    }
    const root: TreeNode.Node = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [signatureNode],
    }
    const schema = FunctionElement.createSchema({ rootNode: root })
    const field = schema.fields.find((candidate) => candidate.key === 'signatureMode')
    if (field?.type !== 'select') return
    const values = {
      signatureMode: 'inline',
      signatureTypeId: 'source-signature',
      signatureDefinition: '',
    }

    field.onValueChange?.('refer', 'inline', values)

    expect(SignatureDefinition.parse(values.signatureDefinition)).toMatchObject({
      async: true,
      parameters: [{ id: 'value', valueType: { type: 'number' } }],
      returnType: { valueType: { type: 'string' } },
    })
  })

  it('always offers Return and appends later Procedure items normally', () => {
    const withoutReturn = createTree()
    const initialItems = FunctionProcedureElement.definition.getContextMenu({
      element: withoutReturn.procedure.element,
      node: withoutReturn.procedure,
      parentNode: withoutReturn.owner,
      rootNode: withoutReturn.root,
    })
    expect(initialItems.map((item) => item.label)).toEqual([
      'Add declare',
      'Add statement',
      'Add directive',
      'Add Block',
    ])
    const initialStatement = initialItems[1]
    expect(initialStatement.type).toBe('parent')
    if (initialStatement.type === 'parent') {
      expect(initialStatement.children.map((item) => item.label))
        .toEqual(['Action', 'Promise', 'Transition', 'Return'])
    }

    const withReturn = createTree(true)
    const items = FunctionProcedureElement.definition.getContextMenu({
      element: withReturn.procedure.element,
      node: withReturn.procedure,
      parentNode: withReturn.owner,
      rootNode: withReturn.root,
    })
    const addAction = items[1]
    expect(addAction.type).toBe('parent')
    if (addAction.type !== 'parent') return
    expect(addAction.children.map((item) => item.label))
      .toEqual(['Action', 'Promise', 'Transition', 'Return'])
    const actionItem = addAction.children[0]
    expect(actionItem.type).toBe('action')
    if (actionItem.type !== 'action') return
    actionItem.callback()
    expect(get(elementDialogStore)).toMatchObject({
      mode: 'create',
      parentNodeId: withReturn.procedure.id,
      insertIndex: undefined,
    })
  })

  it('requires a Return expression only for a non-void Function', () => {
    expect(FunctionReturnElement.createSchema({ required: false }).fields[0])
      .toMatchObject({ type: 'formula', required: false })
    expect(FunctionReturnElement.createSchema({ required: true }).fields[0])
      .toMatchObject({ type: 'formula', required: true })
  })

  it('marks Variable initialization as await-capable only when owned by an async Function', () => {
    const sourceField = VariableElement.createSchema().fields
      .find((field) => field.key === 'source')
    expect(sourceField).toMatchObject({
      type: 'formula',
      allowAwaitInAsyncFunction: true,
    })
  })

  it('offers Return inside a Procedure Block and allows sibling reordering', () => {
    const { root, procedure } = createTree()
    const block: TreeNode.Node & { element: BlockElement.Element } = {
      id: 6,
      element: BlockElement.create('guard'),
      isOpen: true,
      children: [],
    }
    procedure.children.push(block)

    const items = BlockElement.definition.getContextMenu({
      element: block.element,
      node: block,
      parentNode: procedure,
      rootNode: root,
    })
    const statementMenu = items.find((item) => item.label === 'Add statement')
    expect(statementMenu?.type).toBe('parent')
    if (statementMenu?.type === 'parent') {
      expect(statementMenu.children.map((item) => item.label))
        .toEqual(['Action', 'Promise', 'Transition', 'Return'])
    }
    expect(FunctionReturnElement.definition.reorderGroup).toBe('siblings')
  })
})
