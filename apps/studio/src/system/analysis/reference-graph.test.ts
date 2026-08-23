import { describe, expect, it } from 'vitest'
import ReferenceGraph from './reference-graph'
import type TreeNode from '../tree/tree-node'

const node = (
  id: number,
  element: Record<string, unknown>,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children,
})

describe('ReferenceGraph', () => {
  it('collects expression references and formats both directions with node ids', () => {
    const state = node(3, {
      kind: 'state',
      id: 'data',
      initial: JSON.stringify({ type: 'formula', source: '0' }),
    })
    const tag = node(21, {
      kind: 'tag',
      tagName: 'div',
      comment: '',
      attributes: JSON.stringify([
        {
          type: 'attribute',
          name: 'class',
          value: { type: 'formula', source: '$state.data' },
        },
      ]),
      styles: '[]',
    })
    const conditional = node(33, {
      kind: 'if',
      condition: '$state.data > 0',
    })
    const loopChild = node(42, {
      kind: 'if',
      condition: '$var.index > 0',
    })
    const loop = node(41, {
      kind: 'loop',
      mode: 'count',
      countSource: '$state.data',
      indexId: 'index',
    }, [loopChild])
    const root = node(1, { kind: 'project' }, [state, tag, conditional, loop])

    const stateGraph = ReferenceGraph.build(root, state.id)
    expect(stateGraph.canHaveReferences).toBe(true)
    expect(stateGraph.canHaveDependencies).toBe(true)
    expect(stateGraph.references).toEqual([
      {
        sourceNodeId: 21,
        sourceLabel: 'tag#attribute',
        targetNodeId: 3,
        targetLabel: 'state.data',
      },
      {
        sourceNodeId: 33,
        sourceLabel: 'if#condition',
        targetNodeId: 3,
        targetLabel: 'state.data',
      },
      {
        sourceNodeId: 41,
        sourceLabel: 'loop#count',
        targetNodeId: 3,
        targetLabel: 'state.data',
      },
    ])

    const tagGraph = ReferenceGraph.build(root, tag.id)
    expect(tagGraph.canHaveReferences).toBe(false)
    expect(tagGraph.canHaveDependencies).toBe(true)
    expect(tagGraph.dependencies).toEqual([
      {
        sourceNodeId: 21,
        targetNodeId: 3,
        targetLabel: 'state.data',
      },
    ])

    const projectGraph = ReferenceGraph.build(root, root.id)
    expect(projectGraph.canHaveReferences).toBe(false)
    expect(projectGraph.canHaveDependencies).toBe(false)
    expect(projectGraph.references).toEqual([])
    expect(projectGraph.dependencies).toEqual([])

    const loopGraph = ReferenceGraph.build(root, loop.id)
    expect(loopGraph.canHaveReferences).toBe(false)
    expect(loopGraph.references).toEqual([])

    const loopChildGraph = ReferenceGraph.build(root, loopChild.id)
    expect(loopChildGraph.dependencies).toEqual([
      {
        sourceNodeId: loopChild.id,
        targetNodeId: loop.id,
        targetLabel: 'loop.index',
      },
    ])
  })
})
