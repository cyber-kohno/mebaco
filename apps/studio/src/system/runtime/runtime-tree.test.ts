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
    const componentNode = node(1, { kind: 'component', id: 'Sample' }, [
      node(2, { kind: 'props' }),
      node(3, { kind: 'retention' }),
      node(4, { kind: 'elements' }, [componentUseNode]),
    ])

    expect(RuntimeTree.getComponentRootViewNodes(componentNode)).toEqual([componentUseNode])
  })

  it('keeps local components out of app entry component nodes', () => {
    const appNode = node(1, { kind: 'app', id: 'Main' }, [
      node(2, { kind: 'component', id: 'Global' }),
      node(3, { kind: 'retention' }, [
        node(4, { kind: 'component', id: 'Local', local: true }),
      ]),
    ])

    const runtime = RuntimeTree.createAppRuntime(appNode, node(10, { kind: 'project' }))

    expect(runtime.componentNodes.map((componentNode) => componentNode.element)).toEqual([
      { kind: 'component', id: 'Global' },
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
    const componentNode = node(1, { kind: 'component', id: 'Sample' }, [
      node(2, { kind: 'props' }),
      node(3, { kind: 'retention' }),
      node(4, { kind: 'elements' }, [tagNode]),
    ])

    expect(RuntimeTree.getComponentRootViewNodes(componentNode)).toEqual([tagNode])
  })
})
