import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '@system/model/tree/tree-node'
import App from '@system/model/app/app'
import ComponentUseElement from '@system/model/component/component-use'
import DebugConfigurationElement from '@system/model/debug/debug-configuration'
import TagElement from '@system/model/view/tag'
import ElementSearchCatalog from './element-search-catalog'

vi.mock('@system/workspace/tree/state', () => ({
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
    const app = node(3, App.create('admin-app', 'app-uuid'), [componentUse, tag])
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

  it('collects every node with its node ID in node search mode', () => {
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, App.create('admin-app', 'app-uuid'), [
          node(4, ComponentUseElement.create()),
        ]),
      ]),
    ])

    expect(ElementSearchCatalog.create(root, 'node-id')).toMatchObject([
      { nodeId: 1, kind: 'project', address: '1', idText: 'node-1' },
      { nodeId: 2, kind: 'apps', address: '1.2', idText: 'node-2' },
      { nodeId: 3, kind: 'app', address: '1.2.3', idText: 'node-3' },
      { nodeId: 4, kind: 'component-use', address: '1.2.3.4', idText: 'node-4' },
    ])
  })
})
