import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'
import TreeStore from '@system/workspace/tree/state'
import type TreeNode from '@system/model/tree/tree-node'
import FunctionProcedureElement from '@system/model/function/function-procedure'
import Variable from '@system/model/variable/variable'
import VariableElementDefinition from './variable-element-definition'

vi.mock('@system/workspace/tree/state', () => ({
  default: {
    removeNode: vi.fn(),
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

describe('Variable deletion policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses expression confirmation and allows force deletion', () => {
    const variable = node(3, Variable.create(
      'value',
      'const',
      { type: 'inferred' },
      '1',
    )) as TreeNode.Node & { element: Variable.Element }
    const procedure = node(2, FunctionProcedureElement.create(), [variable])
    const root = node(1, { kind: 'project' }, [procedure])
    const item = VariableElementDefinition.definition.getContextMenu({
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
