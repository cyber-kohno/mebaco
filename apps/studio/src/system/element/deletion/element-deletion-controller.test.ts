import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import ExpressionVerificationStore from '../../validation/expression-verification-store'
import ElementDeletionController from './element-deletion-controller'

vi.mock('../../feedback/confirm/confirm-dialog-controller', () => ({
  default: {
    open: vi.fn(() => Promise.resolve(false)),
    openNotice: vi.fn(() => Promise.resolve()),
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

    await expect(ElementDeletionController.requestDelete({
      rootNode: node(1, { kind: 'project' }, [component, entry]),
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
  })
})
