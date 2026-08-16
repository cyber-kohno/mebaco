import { describe, expect, it } from 'vitest'
import type TreeNode from '../tree/tree-node'
import FormulaContext from './formula/formula-context'
import RuntimeProps from './runtime-props'
import type RuntimeTree from './runtime-tree'

const componentNode = {
  id: 4,
  element: { kind: 'component', id: 'Sample' },
  isOpen: true,
  children: [{
    id: 5,
    element: { kind: 'props' },
    isOpen: true,
    children: [
      {
        id: 6,
        element: {
          kind: 'value-prop',
          propId: 'title-id',
          id: 'title',
          valueType: { type: 'string' },
          nullable: false,
          defaultValue: { type: 'literal', value: 'default title' },
        },
        isOpen: true,
        children: [],
      },
      {
        id: 7,
        element: {
          kind: 'value-prop',
          propId: 'count-id',
          id: 'count',
          valueType: { type: 'number' },
          nullable: false,
        },
        isOpen: true,
        children: [],
      },
    ],
  }],
} as TreeNode.Node

const entryNode = {
  id: 3,
  element: {
    kind: 'entry',
    componentId: 'Sample',
    propBindings: [{
      propId: 'count-id',
      kind: 'value',
      source: { type: 'formula', source: '$state.base + 1' },
    }],
  },
  isOpen: true,
  children: [],
} as TreeNode.Node

describe('RuntimeProps', () => {
  it('combines Component defaults and explicit Entry bindings', () => {
    const projectNode = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [],
    } as TreeNode.Node
    const runtime = {
      projectNode,
      appNode: projectNode,
      entryNode,
      stateNodes: [],
      componentNodes: [componentNode],
      styleNodes: [],
    } satisfies RuntimeTree.AppRuntime

    const result = RuntimeProps.resolveEntry(
      runtime,
      componentNode,
      FormulaContext.create({ $state: { base: 2 } }),
    )

    expect(result.errors).toEqual([])
    expect(result.values).toEqual({ title: 'default title', count: 3 })
  })
})
