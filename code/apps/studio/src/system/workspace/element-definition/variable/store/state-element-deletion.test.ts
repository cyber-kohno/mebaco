import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDeletionController from '@system/workspace/element-editor/deletion/element-deletion-controller'
import TreeStore from '@system/workspace/tree/state'
import type TreeNode from '@system/model/tree/tree-node'
import States from '@system/model/variable/states'
import State from '@system/model/variable/state'
import StateElementDefinition from './state-element-definition'
import TypeExpression from '@system/model/type-system/type-expression'

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

describe('State deletion policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses expression confirmation and allows force deletion', () => {
    const state = node(3, State.create({
      id: 'data',
      valueType: TypeExpression.createPrimitive('number'),
      nullable: false,
      initial: { type: 'default' },
    })) as TreeNode.Node & { element: State.Element }
    const states = node(2, States.create(), [state])
    const root = node(1, { kind: 'project' }, [states])
    const item = StateElementDefinition.definition.getContextMenu({
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
