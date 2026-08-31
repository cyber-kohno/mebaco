import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDeletionController from '../../../deletion/element-deletion-controller'
import TreeStore from '../../../../store/tree-store'
import type TreeNode from '../../../../tree/tree-node'
import StatesElement from './states-element'
import StateElement from './state-element'
import TypeExpression from '../../type/type-expression'

vi.mock('../../../../store/tree-store', () => ({
  default: {
    removeNode: vi.fn(),
  },
}))

vi.mock('../../../deletion/element-deletion-controller', () => ({
  default: {
    requestDelete: vi.fn(() => Promise.resolve(true)),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('State deletion policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses expression confirmation and allows force deletion', () => {
    const state = node(3, StateElement.create({
      id: 'data',
      valueType: TypeExpression.createPrimitive('number'),
      nullable: false,
      initial: { type: 'default' },
    })) as TreeNode.Node & { element: StateElement.Element }
    const states = node(2, StatesElement.create(), [state])
    const root = node(1, { kind: 'project' }, [states])
    const item = StateElement.definition.getContextMenu({
      element: state.element,
      node: state,
      parentNode: states,
      rootNode: root,
    }).find((candidate) => candidate.label === 'Delete')
    if (item?.type !== 'action') throw new Error('Delete action was not found.')

    item.callback()

    expect(ElementDeletionController.requestDelete).toHaveBeenCalledWith(expect.objectContaining({
      rootNode: root,
      node: state,
      policy: {
        label: "State 'data'",
        structuralReferences: 'ignore',
        expressionReferences: 'confirm',
      },
    }))
    expect(TreeStore.removeNode).not.toHaveBeenCalled()
  })
})
