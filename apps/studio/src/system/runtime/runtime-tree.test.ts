import { describe, expect, it } from 'vitest'
import type TreeNode from '../tree/tree-node'
import RuntimeTree from './runtime-tree'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element,
  isOpen: true,
  children,
})

describe('RuntimeTree', () => {
  it('treats component use as a root view node', () => {
    const componentUseNode = node(5, {
      kind: 'component-use',
      componentId: 'Child',
      propBindings: [],
    })
    const componentNode = node(1, { kind: 'component', componentId: 'sample-id', id: 'Sample' }, [
      node(2, { kind: 'props' }),
      node(3, { kind: 'retention' }),
      node(4, { kind: 'elements' }, [componentUseNode]),
    ])

    expect(RuntimeTree.getComponentRootViewNodes(componentNode)).toEqual([componentUseNode])
  })

  it('keeps local components out of app entry component nodes', () => {
    const appNode = node(1, { kind: 'app', appId: 'main-app-id', id: 'Main' }, [
      node(2, { kind: 'component', componentId: 'global-id', id: 'Global' }),
      node(3, { kind: 'retention' }, [
        node(4, { kind: 'component', componentId: 'local-id', id: 'Local', local: true }),
      ]),
    ])

    const runtime = RuntimeTree.createAppRuntime(appNode, node(10, { kind: 'project' }))

    expect(runtime.componentNodes.map((componentNode) => componentNode.element)).toEqual([
      { kind: 'component', componentId: 'global-id', id: 'Global' },
    ])
  })

  it('finds root view nodes below a component Elements branch', () => {
    const tagNode = node(5, {
      kind: 'tag',
      tagName: 'div',
      comment: '',
      styles: [],
      attributes: [],
    })
    const componentNode = node(1, { kind: 'component', componentId: 'sample-id', id: 'Sample' }, [
      node(2, { kind: 'props' }),
      node(3, { kind: 'retention' }),
      node(4, { kind: 'elements' }, [tagNode]),
    ])

    expect(RuntimeTree.getComponentRootViewNodes(componentNode)).toEqual([tagNode])
  })

  it('finds states below a component Store branch', () => {
    const stateNode = node(5, {
      kind: 'state',
      id: 'localCount',
      valueType: { type: 'number' },
      nullable: false,
      initial: { type: 'literal', value: '1' },
    })
    const componentNode = node(1, { kind: 'component', componentId: 'sample-id', id: 'Sample' }, [
      node(2, { kind: 'props' }),
      node(3, { kind: 'store' }, [
        node(4, { kind: 'states' }, [stateNode]),
      ]),
      node(6, { kind: 'retention' }),
      node(7, { kind: 'elements' }),
    ])

    expect(RuntimeTree.getComponentStateNodes(componentNode)).toEqual([stateNode])
  })

  it('reports App entry configuration errors separately from empty view content', () => {
    const appNode = node(1, { kind: 'app', appId: 'main-app-id', id: 'Main' }, [
      node(2, { kind: 'entry', componentId: null, propBindings: [] }),
    ])
    const runtime = RuntimeTree.createAppRuntime(appNode, node(10, { kind: 'project' }))

    expect(RuntimeTree.getEntryConfigurationError(runtime)).toBe(
      'Entry component is not configured.',
    )
  })

  it('accepts an entry component even when it has no view elements', () => {
    const componentNode = node(4, { kind: 'component', componentId: 'main-view-id', id: 'MainView' }, [
      node(5, { kind: 'elements' }),
    ])
    const appNode = node(1, { kind: 'app', appId: 'main-app-id', id: 'Main' }, [
      componentNode,
      node(6, { kind: 'entry', componentId: 'main-view-id', propBindings: [] }),
    ])
    const runtime = RuntimeTree.createAppRuntime(appNode, node(10, { kind: 'project' }))

    expect(RuntimeTree.getEntryConfigurationError(runtime)).toBeNull()
    expect(RuntimeTree.getComponentRootViewNodes(componentNode)).toEqual([])
  })
})
