import { beforeEach, describe, expect, it, vi } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import ConfirmDialogController from '../../feedback/confirm/confirm-dialog-controller'
import ElementDeletionController from './element-deletion-controller'

vi.mock('../../feedback/confirm/confirm-dialog-controller', () => ({
  default: {
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
  beforeEach(() => vi.clearAllMocks())

  it('blocks Component deletion while a surviving structural reference exists', () => {
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

    expect(ElementDeletionController.requestDelete({
      rootNode: root,
      node: component,
      policy: { label: 'Component', structuralReferences: 'block' },
      deleteNode,
    })).toBe(false)

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

  it('ignores references inside the deleted Component subtree', () => {
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

    expect(ElementDeletionController.requestDelete({
      rootNode: root,
      node: component,
      policy: { label: 'Component', structuralReferences: 'block' },
      deleteNode,
    })).toBe(true)

    expect(deleteNode).toHaveBeenCalledOnce()
    expect(ConfirmDialogController.openNotice).not.toHaveBeenCalled()
  })
})
