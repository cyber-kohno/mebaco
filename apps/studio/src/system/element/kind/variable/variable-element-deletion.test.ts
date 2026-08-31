import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDeletionController from '../../deletion/element-deletion-controller'
import TreeStore from '../../../store/tree-store'
import type TreeNode from '../../../tree/tree-node'
import FunctionProcedureElement from '../function/function-procedure-element'
import VariableElement from './variable-element'

vi.mock('../../../store/tree-store', () => ({
  default: {
    removeNode: vi.fn(),
  },
}))

vi.mock('../../deletion/element-deletion-controller', () => ({
  default: {
    requestDelete: vi.fn(() => Promise.resolve(true)),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('Variable deletion policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses expression confirmation and allows force deletion', () => {
    const variable = node(3, VariableElement.create(
      'value',
      'const',
      { type: 'inferred' },
      '1',
    )) as TreeNode.Node & { element: VariableElement.Element }
    const procedure = node(2, FunctionProcedureElement.create(), [variable])
    const root = node(1, { kind: 'project' }, [procedure])
    const item = VariableElement.definition.getContextMenu({
      element: variable.element,
      node: variable,
      parentNode: procedure,
      rootNode: root,
    }).find((candidate) => candidate.label === 'Delete')
    if (item?.type !== 'action') throw new Error('Delete action was not found.')

    item.callback()

    expect(ElementDeletionController.requestDelete).toHaveBeenCalledWith(expect.objectContaining({
      rootNode: root,
      node: variable,
      policy: {
        label: "Variable 'value'",
        structuralReferences: 'ignore',
        expressionReferences: 'confirm',
      },
    }))
    expect(TreeStore.removeNode).not.toHaveBeenCalled()
  })
})
