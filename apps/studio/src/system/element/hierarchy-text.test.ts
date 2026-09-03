import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '../tree/tree-node'
import ElementRegistry from './element-registry'
import AppElement from './kind/app/app-element'
import ComponentElement from './kind/component/definition/component-element'
import ComponentUseElement from './kind/component/reference/component-use-element'
import TagElement from './kind/view/tag/tag-element'

vi.mock('../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('hierarchy text', () => {
  it('uses element-specific text and falls back to kind', () => {
    const component = node(5, ComponentElement.create('UserCard', 'component-uuid'))
    const componentUse = node(8, {
      ...ComponentUseElement.create(),
      componentId: 'component-uuid',
    })
    const tag = node(9, TagElement.create('div', ''))
    const app = node(2, AppElement.create('admin-app', 'app-uuid'), [
      node(3, { kind: 'declares' }, [
        node(4, { kind: 'components' }, [component]),
      ]),
      node(6, ComponentElement.create('Page', 'page-uuid'), [
        node(7, { kind: 'elements' }, [componentUse, tag]),
      ]),
    ])
    const root = node(1, { kind: 'project' }, [node(10, { kind: 'apps' }, [app])])

    expect(ElementRegistry.getHierarchyText(root, root)).toBe('project')
    expect(ElementRegistry.getHierarchyText(root, app)).toBe('admin-app')
    expect(ElementRegistry.getHierarchyText(root, component)).toBe('UserCard')
    expect(ElementRegistry.getHierarchyText(root, tag)).toBe('<div>')
    expect(ElementRegistry.getHierarchyText(root, componentUse)).toBe('<UserCard>')
  })

  it('shows an empty component placeholder when the reference cannot be resolved', () => {
    const componentUse = node(2, {
      ...ComponentUseElement.create(),
      componentId: 'missing-component',
    })
    const root = node(1, { kind: 'project' }, [componentUse])

    expect(ElementRegistry.getHierarchyText(root, componentUse)).toBe('<->')
  })
})
