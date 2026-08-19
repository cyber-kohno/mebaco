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
    element: FunctionElement.create('calculate'),
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
      async: 'true',
      voidReturn: 'false',
      returnType,
    })).toEqual({
      kind: 'function',
      id: 'loadCount',
      async: true,
      returnType: {
        valueType: { type: 'number' },
        nullable: true,
      },
    })
  })

  it('shows Void by default and reuses Value Type fields only for non-void Functions', () => {
    const schema = FunctionElement.createSchema()

    expect(schema.fields.map((field) => ({
      type: field.type,
      key: field.key,
      label: field.label,
      defaultValue: 'defaultValue' in field ? field.defaultValue : undefined,
      visibleWhen: field.visibleWhen,
    }))).toEqual([
      expect.objectContaining({ type: 'text', key: 'id', label: 'Id' }),
      expect.objectContaining({
        type: 'checkbox', key: 'async', label: 'Async', defaultValue: 'false',
      }),
      expect.objectContaining({
        type: 'heading', key: 'returnTypeHeading', label: 'Return Type',
      }),
      expect.objectContaining({
        type: 'checkbox', key: 'voidReturn', label: 'Void', defaultValue: 'true',
      }),
      expect.objectContaining({
        type: 'valueType',
        key: 'returnType',
        visibleWhen: { key: 'voidReturn', value: 'false' },
      }),
    ])

    expect(schema.create({
      id: 'notify',
      async: 'false',
      voidReturn: 'true',
      returnType: ValueTypeDefinition.stringify(ValueTypeDefinition.create(
        TypeExpression.createPrimitive('number'),
      )),
    }).returnType).toBeNull()

    expect(schema.getInitialValues(FunctionElement.create('notify'))).toMatchObject({
      async: 'false',
      voidReturn: 'true',
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
        .toEqual(['Action', 'Return'])
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
    expect(addAction.children.map((item) => item.label)).toEqual(['Action'])
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
