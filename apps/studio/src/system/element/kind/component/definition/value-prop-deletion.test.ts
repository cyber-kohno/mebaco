import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDeletionController from '../../../deletion/element-deletion-controller'
import TreeStore from '../../../../store/tree-store'
import type TreeNode from '../../../../tree/tree-node'
import PropsElement from './props-element'
import ValuePropElement from './value-prop-element'
import ComponentElement from './component-element'
import SlotElement from './slot/slot-element'

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

const getDeleteAction = (
  rootNode: TreeNode.Node,
  propsNode: TreeNode.Node,
  propNode: TreeNode.Node & { element: ValuePropElement.Element },
): ActionMenuState.ActionItem => {
  const item = ValuePropElement.definition.getContextMenu({
    element: propNode.element,
    node: propNode,
    parentNode: propsNode,
    rootNode,
  }).find((candidate) => candidate.label === 'Delete')
  if (item?.type !== 'action') throw new Error('Delete action was not found.')
  return item
}

describe('Value Prop deletion policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses expression confirmation for Component Props', () => {
    const prop = node(4, ValuePropElement.create('name')) as TreeNode.Node & {
      element: ValuePropElement.Element
    }
    const props = node(3, PropsElement.create(), [prop])
    const component = node(2, ComponentElement.create('Main'), [props])
    const root = node(1, { kind: 'project' }, [component])

    getDeleteAction(root, props, prop).callback()

    expect(ElementDeletionController.requestDelete).toHaveBeenCalledWith(expect.objectContaining({
      rootNode: root,
      node: prop,
      policy: {
        label: "Prop 'name'",
        structuralReferences: 'ignore',
        expressionReferences: 'confirm',
      },
    }))
    expect(TreeStore.removeNode).not.toHaveBeenCalled()
  })

  it('keeps Slot Prop deletion immediate', () => {
    const prop = node(4, ValuePropElement.create('item')) as TreeNode.Node & {
      element: ValuePropElement.Element
    }
    const props = node(3, PropsElement.create(), [prop])
    const slot = node(2, SlotElement.create('content'), [props])
    const root = node(1, { kind: 'project' }, [slot])

    getDeleteAction(root, props, prop).callback()

    expect(TreeStore.removeNode).toHaveBeenCalledWith(prop.id)
    expect(ElementDeletionController.requestDelete).not.toHaveBeenCalled()
  })
})
