import { describe, expect, it, vi } from 'vitest'
import FunctionElement from '@system/model/function/function-definition'
import FunctionReturnElement from '@system/model/function/function-return'
import FunctionProcedureElementDefinition from './function-procedure-element-definition'
import FunctionElementDefinition from './function-element-definition'
import SignatureDefinition from '@system/model/type-system/signature/signature-definition'
import TypeExpression from '@system/model/type-system/type-expression'
import type TreeNode from '@system/model/tree/tree-node'
import FunctionDeletionPolicy from '@system/model/function/function-deletion-policy'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'

vi.mock('@system/workspace/tree/state', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))

vi.mock('@system/model/function/function-deletion-policy', () => ({
  default: {
    collectRebindings: vi.fn(() => []),
  },
}))

vi.mock('@system/workspace/element-editor/deletion/element-deletion-controller', () => ({
  default: {
    requestDelete: vi.fn(() => Promise.resolve(true)),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('FunctionElement', () => {
  it('creates an Inline Procedure Function by default', () => {
    expect(FunctionElement.createInline('calculate')).toEqual({
      kind: 'function',
      id: 'calculate',
      signature: {
        mode: 'inline',
        definition: SignatureDefinition.create(),
      },
      implementation: { mode: 'procedure' },
    })
  })

  it('creates Procedure only for Procedure implementations', () => {
    const procedureChildren = FunctionElementDefinition.definition.createInitialChildren?.(
      FunctionElement.createInline('procedure'),
    )
    const codeChildren = FunctionElementDefinition.definition.createInitialChildren?.(
      FunctionElement.createInline(
        'code',
        SignatureDefinition.create(),
        { mode: 'code', source: 'return 1' },
      ),
    )

    expect(procedureChildren?.map((seed) => seed.element.kind)).toEqual([
      'function-procedure',
    ])
    expect(codeChildren).toEqual([])
    expect(FunctionProcedureElementDefinition.definition.createInitialChildren?.()).toEqual([])
  })

  it('stores parameters in the owned Signature definition', () => {
    const parameter = SignatureDefinition.createParameter(
      'count',
      TypeExpression.createPrimitive('number'),
      true,
      'parameter-id',
    )
    expect(FunctionElement.createInline(
      'calculate',
      SignatureDefinition.create(false, [parameter]),
    ).signature).toEqual({
      mode: 'inline',
      definition: {
        async: false,
        parameters: [{
          parameterId: 'parameter-id',
          id: 'count',
          valueType: { type: 'number' },
          nullable: true,
        }],
        returnType: null,
      },
    })
    expect(FunctionReturnElement.create('$args.count')).toEqual({
      kind: 'function-return',
      source: '$args.count',
    })
  })

  it('routes Delete through the Function deletion policy', () => {
    const functionNode = node(3, FunctionElement.createInline('calculate')) as (
      TreeNode.Node & { element: FunctionElement.Element }
    )
    const manager = node(2, { kind: 'functions' }, [functionNode])
    const root = node(1, { kind: 'project' }, [manager])
    const item = FunctionElementDefinition.definition.getContextMenu({
      rootNode: root,
      parentNode: manager,
      node: functionNode,
      element: functionNode.element,
    }).find((candidate) => candidate.label === 'Delete')
    if (item?.type !== 'action') throw new Error('Delete action was not found.')

    item.callback()

    expect(ElementDeletionController.requestDelete).toHaveBeenCalledWith(expect.objectContaining({
      rootNode: root,
      node: functionNode,
      policy: {
        label: "Function 'calculate'",
        structuralReferences: 'ignore',
        expressionReferences: 'confirm',
      },
      expressionReferenceGuard: expect.any(Function),
      getRootNodeAfterDelete: expect.any(Function),
    }))
    expect(FunctionDeletionPolicy.collectRebindings).not.toHaveBeenCalled()
  })
})
