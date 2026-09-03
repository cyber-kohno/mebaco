import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '../tree/tree-node'
import AppElement from '../element/kind/app/app-element'
import ComponentUseElement from '../element/kind/component/reference/component-use-element'
import DebugConfigurationElement from '../element/kind/debug/debug-configuration-element'
import TagElement from '../element/kind/view/tag/tag-element'
import ElementSearchCatalog from './element-search-catalog'

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

describe('ElementSearchCatalog', () => {
  it('collects registered node elements in tree order with hierarchy addresses', () => {
    const componentUse = node(4, ComponentUseElement.create())
    const tag = node(5, TagElement.create('div', ''))
    const app = node(3, AppElement.create('admin-app', 'app-uuid'), [componentUse, tag])
    const customConfiguration = node(
      7,
      DebugConfigurationElement.createCustom('Local files', 'configuration-uuid'),
    )
    const defaultConfiguration = node(
      8,
      DebugConfigurationElement.createDefault('default-configuration-uuid'),
    )
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [app]),
      node(6, { kind: 'debug-configurations' }, [customConfiguration, defaultConfiguration]),
    ])

    expect(ElementSearchCatalog.create(root)).toMatchObject([
      { nodeId: 3, kind: 'app', address: '1.2.3', idText: 'admin-app' },
      { nodeId: 7, kind: 'debug-configuration', address: '1.6.7', idText: 'Local files' },
      { nodeId: 8, kind: 'debug-configuration', address: '1.6.8', idText: 'default' },
    ])
  })
})
