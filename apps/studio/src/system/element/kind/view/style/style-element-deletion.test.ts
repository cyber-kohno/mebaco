import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDeletionController from '../../../deletion/element-deletion-controller'
import TreeStore from '../../../../store/tree-store'
import type TreeNode from '../../../../tree/tree-node'
import StyleElement from './style-element'

vi.mock('../../../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
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
  styleNode: TreeNode.Node & { element: StyleElement.Element },
): ActionMenuState.ActionItem => {
  const item = StyleElement.definition.getContextMenu({
    element: styleNode.element,
    node: styleNode,
    parentNode: rootNode,
    rootNode,
  }).find((candidate) => candidate.label === 'Delete')
  if (item?.type !== 'action') throw new Error('Delete action was not found.')
  return item
}

describe('Style deletion policy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('blocks deletion through the structural reference policy', () => {
    const style = node(2, StyleElement.create('base')) as TreeNode.Node & {
      element: StyleElement.Element
    }
    const root = node(1, { kind: 'project' }, [style])

    getDeleteAction(root, style).callback()

    expect(ElementDeletionController.requestDelete).toHaveBeenCalledWith(expect.objectContaining({
      rootNode: root,
      node: style,
      policy: {
        label: 'Style',
        structuralReferences: 'block',
      },
    }))
    expect(TreeStore.removeNode).not.toHaveBeenCalled()
  })
})
