import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import ExpressionVerificationStore from '../../validation/expression/expression-verification-store'
import ExpressionVerificationRunner from '../../validation/expression/expression-verification-runner'
import ElementDeletionController from './element-deletion-controller'

vi.mock('../../feedback/confirm/confirm-dialog-controller', () => ({
  default: {
    open: vi.fn(() => Promise.resolve(false)),
    openNotice: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('../../validation/expression/expression-verification-runner', () => ({
  default: {
    verify: vi.fn(() => Promise.resolve({
      status: 'error',
      messages: ['Unknown Function.'],
    })),
  },
}))

const node = (
  id: number,
  element: Record<string, unknown>,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children,
})

describe('ElementDeletionController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ExpressionVerificationStore.clear()
  })

  it('blocks Component deletion while a surviving structural reference exists', async () => {
    const component = node(5, {
      kind: 'component',
      componentId: 'component-uuid',
      id: 'Main',
    })
    const entry = node(6, {
      kind: 'entry',
      componentId: 'component-uuid',
      propBindings: [],
    })
    const root = node(1, { kind: 'project' }, [component, entry])
    const deleteNode = vi.fn()

    await expect(ElementDeletionController.requestDelete({
      rootNode: root,
      node: component,
      policy: { label: 'Component', structuralReferences: 'block' },
      deleteNode,
    })).resolves.toBe(false)

    expect(deleteNode).not.toHaveBeenCalled()
    expect(ConfirmDialogController.openNotice).toHaveBeenCalledWith({
      title: 'Cannot Delete Component',
      message: [
        'Component is referenced by 1 element.',
        'node-6: entry#componentId',
        'Remove the reference before deleting this Component.',
      ],
    })
  })

  it('ignores references inside the deleted Component subtree', async () => {
    const componentUse = node(6, {
      kind: 'component-use',
      componentId: 'component-uuid',
      propBindings: [],
    })
    const component = node(5, {
      kind: 'component',
      componentId: 'component-uuid',
      id: 'Recursive',
    }, [componentUse])
    const root = node(1, { kind: 'project' }, [component])
    const deleteNode = vi.fn()

    await expect(ElementDeletionController.requestDelete({
      rootNode: root,
      node: component,
      policy: { label: 'Component', structuralReferences: 'block' },
      deleteNode,
    })).resolves.toBe(true)

    expect(deleteNode).toHaveBeenCalledOnce()
    expect(ConfirmDialogController.openNotice).not.toHaveBeenCalled()
  })

  it('confirms expression references, allows force deletion, and clears verification', async () => {
    const prop = node(4, {
      kind: 'value-prop',
      propId: 'name-prop',
      id: 'name',
      valueType: { type: 'string' },
      nullable: false,
    })
    const expression = node(5, {
      kind: 'if',
      condition: '$props.name.length > 0',
    })
    const component = node(2, {
      kind: 'component',
      componentId: 'component-uuid',
      id: 'Main',
    }, [node(3, { kind: 'props' }, [prop]), expression])
    const entry = node(6, {
      kind: 'entry',
      componentId: 'component-uuid',
      propBindings: [{
        propId: 'name-prop',
        kind: 'value',
        source: { type: 'literal', value: '' },
      }],
    })
    const root = node(1, { kind: 'project' }, [component, entry])
    const deleteNode = vi.fn()
    const request = {
      rootNode: root,
      node: prop,
      policy: {
        label: "Prop 'name'",
        structuralReferences: 'ignore' as const,
        expressionReferences: 'confirm' as const,
      },
      deleteNode,
    }
    ExpressionVerificationStore.setResult(expression, {
      status: 'verified',
      messages: [],
    })

    vi.mocked(ConfirmDialogController.open).mockResolvedValueOnce(false)
    await expect(ElementDeletionController.requestDelete(request)).resolves.toBe(false)
    expect(deleteNode).not.toHaveBeenCalled()
    expect(get(ExpressionVerificationStore.entries)).not.toEqual({})

    vi.mocked(ConfirmDialogController.open).mockResolvedValueOnce(true)
    await expect(ElementDeletionController.requestDelete(request)).resolves.toBe(true)
    expect(deleteNode).toHaveBeenCalledOnce()
    expect(get(ExpressionVerificationStore.entries)).toEqual({})
    expect(ConfirmDialogController.open).toHaveBeenLastCalledWith(expect.objectContaining({
      tone: 'danger',
      title: "Delete Prop 'name'?",
      choices: [
        { label: 'Cancel', role: 'cancel' },
        { label: 'Delete Anyway', role: 'proceed' },
      ],
    }))
  })

  it('ignores structural Prop bindings when no expression reference exists', async () => {
    const prop = node(4, {
      kind: 'value-prop',
      propId: 'name-prop',
      id: 'name',
      valueType: { type: 'string' },
      nullable: false,
    })
    const component = node(2, {
      kind: 'component',
      componentId: 'component-uuid',
      id: 'Main',
    }, [node(3, { kind: 'props' }, [prop])])
    const entry = node(6, {
      kind: 'entry',
      componentId: 'component-uuid',
      propBindings: [{
        propId: 'name-prop',
        kind: 'value',
        source: { type: 'literal', value: '' },
      }],
    })
    const deleteNode = vi.fn()
    const unrelatedExpression = node(7, {
      kind: 'if',
      condition: 'true',
    })
    ExpressionVerificationStore.setResult(unrelatedExpression, {
      status: 'verified',
      messages: [],
    })

    await expect(ElementDeletionController.requestDelete({
      rootNode: node(1, { kind: 'project' }, [component, entry, unrelatedExpression]),
      node: prop,
      policy: {
        label: "Prop 'name'",
        structuralReferences: 'ignore',
        expressionReferences: 'confirm',
      },
      deleteNode,
    })).resolves.toBe(true)

    expect(deleteNode).toHaveBeenCalledOnce()
    expect(ConfirmDialogController.open).not.toHaveBeenCalled()
    expect(get(ExpressionVerificationStore.entries)).not.toEqual({})
  })

  it('blocks deletion when the expression reference guard detects a semantic rebind', async () => {
    const target = node(5, {
      kind: 'function', id: 'save',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [], returnType: null },
      },
      implementation: { mode: 'code', source: 'return undefined' },
    })
    const call = node(8, { kind: 'action', comment: '', source: '$fn.save()' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-id', id: 'app' }, [
        node(3, { kind: 'declares' }, [node(4, { kind: 'functions' }, [target])]),
        call,
      ]),
    ])
    const deleteNode = vi.fn()
    const blocked = {
      title: 'Cannot Delete Function',
      message: ['Deleting this Function would redirect an existing call.'],
    }

    await expect(ElementDeletionController.requestDelete({
      rootNode: root,
      node: target,
      policy: {
        label: "Function 'save'",
        structuralReferences: 'ignore',
        expressionReferences: 'confirm',
      },
      expressionReferenceGuard: () => blocked,
      deleteNode,
    })).resolves.toBe(false)

    expect(ConfirmDialogController.openNotice).toHaveBeenCalledWith(blocked)
    expect(ConfirmDialogController.open).not.toHaveBeenCalled()
    expect(deleteNode).not.toHaveBeenCalled()
  })

  it('resets all verification and verifies direct references after force deletion', async () => {
    const target = node(5, {
      kind: 'function', id: 'save',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [], returnType: null },
      },
      implementation: { mode: 'code', source: 'return undefined' },
    })
    const call = node(8, { kind: 'action', comment: '', source: '$fn.save()' })
    const unrelated = node(9, { kind: 'action', comment: '', source: 'undefined' })
    const app = node(2, { kind: 'app', appId: 'app-id', id: 'app' }, [
      node(3, { kind: 'declares' }, [node(4, { kind: 'functions' }, [target])]),
      call,
      unrelated,
    ])
    const root = node(1, { kind: 'project' }, [app])
    const nextRoot = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'app-id', id: 'app' }, [
        node(3, { kind: 'declares' }, [node(4, { kind: 'functions' })]),
        call,
        unrelated,
      ]),
    ])
    ExpressionVerificationStore.setResult(call, { status: 'verified', messages: [] })
    ExpressionVerificationStore.setResult(unrelated, { status: 'verified', messages: [] })
    vi.mocked(ConfirmDialogController.open).mockResolvedValueOnce(true)
    const deleteNode = vi.fn()

    await expect(ElementDeletionController.requestDelete({
      rootNode: root,
      node: target,
      policy: {
        label: "Function 'save'",
        structuralReferences: 'ignore',
        expressionReferences: 'confirm',
      },
      deleteNode,
      getRootNodeAfterDelete: () => nextRoot,
    })).resolves.toBe(true)

    expect(deleteNode).toHaveBeenCalledOnce()
    expect(ExpressionVerificationRunner.verify).toHaveBeenCalledWith(nextRoot, call)
    expect(get(ExpressionVerificationStore.entries)[call.id]).toMatchObject({
      status: 'error',
      messages: ['Unknown Function.'],
    })
    expect(get(ExpressionVerificationStore.entries)[unrelated.id]).toBeUndefined()
  })
})
