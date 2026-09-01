import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '../../../tree/tree-node'
import FunctionActions from '../../function-actions'
import FunctionsElement from './functions-element'

vi.mock('../../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))

const createTree = () => {
  const functions: TreeNode.Node & { element: FunctionsElement.Element } = {
    id: 2,
    element: FunctionsElement.create(),
    isOpen: true,
    children: [],
  }
  const root: TreeNode.Node = {
    id: 1,
    element: { kind: 'project' },
    isOpen: true,
    children: [functions],
  }
  return { root, functions }
}

describe('FunctionsElement menu', () => {
  it('uses Add function directly and Function under Add declare', () => {
    const { root, functions } = createTree()
    const directItems = FunctionsElement.definition.getContextMenu({
      element: functions.element,
      node: functions,
      parentNode: root,
      rootNode: root,
    })
    const declareMenu = FunctionActions.createAddDeclareMenu(functions.id, root)

    expect(directItems.map((item) => item.label)).toEqual(['Add function'])
    expect(declareMenu.children.map((item) => item.label)).toContain('Function')
    expect(declareMenu.children.map((item) => item.label)).not.toContain('Add function')
  })
})
