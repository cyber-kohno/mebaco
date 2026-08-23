import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { elementDialogStore } from '../../../element-dialog/element-dialog-store'
import FunctionArgumentElement from './function-argument-element'
import FunctionElement from './function-element'
import FunctionProcedureElement from './function-procedure-element'
import FunctionReturnElement from './function-return-element'
import TypeExpression from '../type/type-expression'
import ValueTypeDefinition from '../type/value-type-definition'
import type TreeNode from '../../../tree/tree-node'

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
    children: [
      { id: 3, element: { kind: 'function-arguments' }, isOpen: true, children: [] },
      procedure,
    ],
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
  it('round-trips async and return type values through the Function schema', () => {
    const schema = FunctionElement.createSchema()
    const returnType = ValueTypeDefinition.stringify(ValueTypeDefinition.create(
      TypeExpression.createPrimitive('number'),
      true,
    ))

    expect(schema.create({
      id: 'loadCount',
      mode: 'inline',
      async: 'true',
      voidReturn: 'false',
      returnType,
    })).toEqual({
      kind: 'function',
      id: 'loadCount',
      mode: 'inline',
      async: true,
      returnType: {
        valueType: { type: 'number' },
        nullable: true,
      },
    })
  })

  it('shows Inline fields by default and switches to a Signature for Refer mode', () => {
    const schema = FunctionElement.createSchema()

    expect(schema.fields.map((field) => field.key)).toEqual([
      'id', 'mode', 'async', 'returnTypeHeading', 'voidReturn', 'returnType',
      'signatureTypeId',
    ])
    expect(schema.fields.find((field) => field.key === 'mode')).toMatchObject({
      type: 'select', defaultValue: 'inline',
      options: [
        { value: 'inline', label: 'Inline' },
        { value: 'refer', label: 'Refer' },
      ],
    })
    expect(schema.fields.find((field) => field.key === 'async')).toMatchObject({
      visibleWhen: { key: 'mode', value: 'inline' },
    })
    expect(schema.fields.find((field) => field.key === 'returnType')).toMatchObject({
      visibleWhenAll: [
        { key: 'mode', value: 'inline' },
        { key: 'voidReturn', value: 'false' },
      ],
    })
    expect(schema.fields.find((field) => field.key === 'signatureTypeId')).toMatchObject({
      width: 'id',
      visibleWhen: { key: 'mode', value: 'refer' },
    })

    expect(schema.create({
      id: 'notify',
      mode: 'inline',
      async: 'false',
      voidReturn: 'true',
      returnType: ValueTypeDefinition.stringify(ValueTypeDefinition.create(
        TypeExpression.createPrimitive('number'),
      )),
    })).toEqual(FunctionElement.createInline('notify'))

    expect(schema.getInitialValues(FunctionElement.createInline('notify'))).toMatchObject({
      mode: 'inline',
      async: 'false',
      voidReturn: 'true',
    })
  })

  it('creates Refer Functions and locks their mode after creation', () => {
    const option = {
      value: 'save-signature', label: 'SaveHandler', kind: 'signature' as const,
      preview: '(payload: string) => void',
    }
    const createSchema = FunctionElement.createSchema({ namedTypeOptions: [option] })
    expect(createSchema.fields.find((field) => field.key === 'signatureTypeId'))
      .toMatchObject({ options: [option] })
    expect(createSchema.create({
      id: 'save',
      mode: 'refer',
      signatureTypeId: option.value,
    })).toEqual(FunctionElement.createRefer('save', option.value))

    const updateSchema = FunctionElement.createSchema({
      namedTypeOptions: [option],
      lockedMode: 'refer',
    })
    expect(updateSchema.fields.find((field) => field.key === 'mode')).toMatchObject({
      readOnlyOnUpdate: true,
      options: [{ value: 'refer', label: 'Refer' }],
    })
  })

  it('round-trips an Argument value type', () => {
    const schema = FunctionArgumentElement.createSchema()
    const valueType = ValueTypeDefinition.stringify(ValueTypeDefinition.create(
      TypeExpression.wrapArray(TypeExpression.createPrimitive('string'), 1),
      true,
    ))

    expect(schema.create({ id: 'names', valueType })).toEqual({
      kind: 'function-argument',
      id: 'names',
      valueType: { type: 'array', item: { type: 'string' } },
      nullable: true,
    })
  })

  it('offers one Return and inserts later Procedure items before it', () => {
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
        .toEqual(['Action', 'Transition', 'Return'])
    }

    const withReturn = createTree(true)
    const items = FunctionProcedureElement.definition.getContextMenu({
      element: withReturn.procedure.element,
      node: withReturn.procedure,
      parentNode: withReturn.owner,
      rootNode: withReturn.root,
    })
    expect(items.map((item) => item.label)).toEqual([
      'Add declare',
      'Add statement',
      'Add directive',
      'Add Block',
    ])

    const addAction = items[1]
    expect(addAction.type).toBe('parent')
    if (addAction.type !== 'parent') return
    expect(addAction.children.map((item) => item.label)).toEqual(['Action', 'Transition'])
    const actionItem = addAction.children[0]
    expect(actionItem.type).toBe('action')
    if (actionItem.type !== 'action') return
    actionItem.callback()
    expect(get(elementDialogStore)).toMatchObject({
      mode: 'create',
      parentNodeId: withReturn.procedure.id,
      insertIndex: 0,
    })
  })

  it('requires a Return expression only for a non-void Function', () => {
    expect(FunctionReturnElement.createSchema({ required: false }).fields[0])
      .toMatchObject({ type: 'formula', required: false })
    expect(FunctionReturnElement.createSchema({ required: true }).fields[0])
      .toMatchObject({ type: 'formula', required: true })
  })
})
